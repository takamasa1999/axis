/**
 * 通報と運営の対応の結合テスト（T056 / FR-016, FR-027, FR-034, FR-035）
 */
import { beforeEach, describe, expect, it } from "vitest";
import { apply } from "@/server/domain/application";
import { getMessagesAfter, sendMessage } from "@/server/domain/conversation";
import { getPublicJob, publishJob, saveJob } from "@/server/domain/job-post";
import {
  getReportDetail,
  hideJob,
  requestJobFix,
  suspendUser,
  unhideJob,
} from "@/server/domain/moderation";
import { createReport } from "@/server/domain/report";
import { db, resetDb } from "../helpers/db";
import { createEmployer, createOperator, createSeeker, reloadActor } from "../helpers/factories";
import { completeJob } from "../helpers/job-fixtures";

const ok = { truthful: true, lawful: true, noLaborDispute: true };

async function setup() {
  const employer = await createEmployer();
  const seeker = await createSeeker();
  const op = await createOperator();
  const { jobId } = await saveJob(employer.actor, null, completeJob());
  await publishJob(employer.actor, jobId, ok);
  const { conversationId } = await apply(seeker.actor, {
    jobId,
    sharedFields: [],
    firstMessage: "1通目",
  });
  await sendMessage(employer.actor, conversationId, "2通目（問題のあるメッセージ）");
  await sendMessage(seeker.actor, conversationId, "3通目");
  return { employer, seeker, op, jobId, conversationId };
}

describe("メッセージの通報", () => {
  beforeEach(resetDb);

  it("選んだメッセージだけが提出物になり、運営はそれ以外を読めない", async () => {
    const s = await setup();
    const { messages } = await getMessagesAfter(s.seeker.actor, s.conversationId);
    const target = messages.find((m) => m.body.startsWith("2通目"));
    const { reportId } = await createReport(s.seeker.actor, {
      targetType: "MESSAGE",
      targetId: s.conversationId,
      reason: "HARASSMENT",
      messageIds: [target?.id as string],
    });
    const detail = await getReportDetail(s.op.actor, reportId);
    expect(detail.report.evidence.map((e) => e.bodyPlain)).toEqual([
      "2通目（問題のあるメッセージ）",
    ]);
    expect(detail.report.evidence[0].senderRole).toBe("COUNTERPART");
    // 運営は会話そのものを読めない
    await expect(getMessagesAfter(s.op.actor, s.conversationId)).rejects.toThrow();
  });

  it("自分が当事者でない会話のメッセージは通報できない", async () => {
    const s = await setup();
    const other = await createSeeker("別の人");
    const { messages } = await getMessagesAfter(s.seeker.actor, s.conversationId);
    await expect(
      createReport(other.actor, {
        targetType: "MESSAGE",
        targetId: s.conversationId,
        reason: "SPAM",
        messageIds: [messages[1].id],
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("運営は通報の詳細を見られるが、一般の利用者は見られない", async () => {
    const s = await setup();
    const { reportId } = await createReport(s.seeker.actor, {
      targetType: "JOB_POST",
      targetId: s.jobId,
      reason: "FALSE_INFO",
    });
    await expect(getReportDetail(s.employer.actor, reportId)).rejects.toThrow();
  });
});

describe("求人への対応", () => {
  beforeEach(resetDb);

  it("修正を依頼すると期限付きで記録され、通報の一次対応の時刻が入る", async () => {
    const s = await setup();
    const { reportId } = await createReport(s.seeker.actor, {
      targetType: "JOB_POST",
      targetId: s.jobId,
      reason: "FALSE_INFO",
    });
    const { fixDeadline } = await requestJobFix(s.op.actor, {
      jobId: s.jobId,
      reason: "業務内容が実際と異なる",
      reportId,
    });
    expect(fixDeadline.getTime()).toBeGreaterThan(Date.now());
    const report = await db.report.findUniqueOrThrow({ where: { id: reportId } });
    expect(report.firstHandledAt).not.toBeNull();
    expect(report.status).toBe("IN_REVIEW");
  });

  it("非公開にすると公開ページに出ず、内容は変わらない。解除すると元に戻る", async () => {
    const s = await setup();
    const before = await db.jobPost.findUniqueOrThrow({ where: { id: s.jobId } });
    await hideJob(s.op.actor, { jobId: s.jobId, reason: "確認のため" });
    expect(await getPublicJob(s.jobId)).toBeNull();
    const hidden = await db.jobPost.findUniqueOrThrow({ where: { id: s.jobId } });
    expect(hidden.title).toBe(before.title);
    expect(hidden.jobDescription).toBe(before.jobDescription);
    expect(hidden.version).toBe(before.version);
    await unhideJob(s.op.actor, { jobId: s.jobId, reason: "問題なし" });
    expect((await getPublicJob(s.jobId))?.open).toBe(true);
  });

  it("企業は運営が止めた求人を自分で公開し直せない", async () => {
    const s = await setup();
    await hideJob(s.op.actor, { jobId: s.jobId, reason: "確認のため" });
    await expect(publishJob(s.employer.actor, s.jobId, ok)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("運営以外は対応できない", async () => {
    const s = await setup();
    await expect(hideJob(s.employer.actor, { jobId: s.jobId, reason: "x" })).rejects.toThrow();
  });
});

describe("アカウントの停止", () => {
  beforeEach(resetDb);

  it("停止されたアカウントはメッセージを送れない", async () => {
    const s = await setup();
    await suspendUser(s.op.actor, { userId: s.employer.user.id, reason: "迷惑行為" });
    const suspended = await reloadActor(s.employer.user.id);
    await expect(sendMessage(suspended, s.conversationId, "こんにちは")).rejects.toMatchObject({
      code: "SUSPENDED",
    });
    // 相手（求職者）からも、停止中のアカウントには送れない
    await expect(sendMessage(s.seeker.actor, s.conversationId, "こんにちは")).rejects.toMatchObject(
      { code: "BLOCKED" },
    );
  });

  it("停止された企業の求人は公開ページに出ない", async () => {
    const s = await setup();
    await suspendUser(s.op.actor, { userId: s.employer.user.id, reason: "迷惑行為" });
    expect(await getPublicJob(s.jobId)).toBeNull();
  });
});
