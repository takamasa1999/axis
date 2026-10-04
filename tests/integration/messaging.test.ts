/**
 * 応募・メッセージの結合テスト（T042 / FR-015, FR-022〜FR-028, FR-037）
 */
import { beforeEach, describe, expect, it } from "vitest";
import { apply, askQuestion } from "@/server/domain/application";
import {
  block,
  getConversationView,
  getMessagesAfter,
  sendMessage,
} from "@/server/domain/conversation";
import { closeJob, publishJob, saveJob } from "@/server/domain/job-post";
import { db, resetDb } from "../helpers/db";
import { createEmployer, createSeeker } from "../helpers/factories";
import { completeJob } from "../helpers/job-fixtures";

const ok = { truthful: true, lawful: true, noLaborDispute: true };

async function setup() {
  const employer = await createEmployer();
  const seeker = await createSeeker();
  const { jobId } = await saveJob(employer.actor, null, completeJob());
  await publishJob(employer.actor, jobId, ok);
  return { employer, seeker, jobId };
}

describe("応募", () => {
  beforeEach(resetDb);

  it("共有を選んだ項目だけが企業に見える", async () => {
    const { employer, seeker, jobId } = await setup();
    const { conversationId } = await apply(seeker.actor, {
      jobId,
      sharedFields: ["experience"],
      firstMessage: "よろしくお願いします",
    });
    const view = await getConversationView(employer.actor, conversationId);
    expect(view.applications[0].sharedProfile).toEqual({
      displayName: "テスト太郎",
      experience: "カフェで2年",
    });
    expect(view.applications[0].sharedProfile).not.toHaveProperty("selfIntroduction");
    expect(view.messages.map((m) => m.kind)).toEqual(["SYSTEM", "USER"]);
  });

  it("同じ求人に二重に応募できない", async () => {
    const { seeker, jobId } = await setup();
    await apply(seeker.actor, { jobId, sharedFields: [] });
    await expect(apply(seeker.actor, { jobId, sharedFields: [] })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("募集が終了した求人には応募できない", async () => {
    const { employer, seeker, jobId } = await setup();
    await closeJob(employer.actor, jobId);
    await expect(apply(seeker.actor, { jobId, sharedFields: [] })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("メール確認が終わっていないと応募できない", async () => {
    const { seeker, jobId } = await setup();
    await expect(
      apply({ ...seeker.actor, emailVerified: false }, { jobId, sharedFields: [] }),
    ).rejects.toMatchObject({
      code: "EMAIL_NOT_VERIFIED",
    });
  });

  it("応募後に労働条件が変わると、応募者の会話にお知らせが届く（FR-015）", async () => {
    const { employer, seeker, jobId } = await setup();
    const { conversationId } = await apply(seeker.actor, { jobId, sharedFields: [] });
    const result = await saveJob(employer.actor, jobId, completeJob({ salaryMin: 1500 }));
    expect(result.notifiedApplicants).toBe(1);
    const { messages } = await getMessagesAfter(seeker.actor, conversationId);
    expect(messages.at(-1)?.body).toContain("労働条件が変更されました");
  });

  it("タイトルだけの変更では知らせない", async () => {
    const { employer, seeker, jobId } = await setup();
    await apply(seeker.actor, { jobId, sharedFields: [] });
    const result = await saveJob(employer.actor, jobId, completeJob({ title: "新しいタイトル" }));
    expect(result.notifiedApplicants).toBe(0);
  });
});

describe("メッセージ", () => {
  beforeEach(resetDb);

  it("本文は暗号化して保存され、当事者には復号して見える", async () => {
    const { employer, seeker, jobId } = await setup();
    const { conversationId } = await askQuestion(seeker.actor, {
      jobId,
      body: "見学はできますか？",
    });
    await sendMessage(employer.actor, conversationId, "はい、できます");
    const raw = await db.message.findMany({ where: { conversationId, kind: "USER" } });
    expect(raw.every((m) => m.bodyEncrypted && !m.bodyEncrypted.includes("見学"))).toBe(true);
    const { messages } = await getMessagesAfter(seeker.actor, conversationId);
    expect(messages.filter((m) => m.kind === "USER").map((m) => [m.sender, m.body])).toEqual([
      ["me", "見学はできますか？"],
      ["them", "はい、できます"],
    ]);
  });

  it("会話の当事者以外は読めない", async () => {
    const { seeker, jobId } = await setup();
    const other = await createEmployer("別の会社");
    const { conversationId } = await askQuestion(seeker.actor, { jobId, body: "質問です" });
    await expect(getMessagesAfter(other.actor, conversationId)).rejects.toThrow();
  });

  it("ブロックされると送れず、ブロックされたことは伝えない", async () => {
    const { employer, seeker, jobId } = await setup();
    const { conversationId } = await askQuestion(seeker.actor, { jobId, body: "質問です" });
    await block(seeker.actor, conversationId);
    await expect(sendMessage(employer.actor, conversationId, "こんにちは")).rejects.toMatchObject({
      code: "BLOCKED",
      message: "このメッセージは送信できません",
    });
  });

  it("10分で30件を超えると送れない（回数制限）", async () => {
    const { employer, seeker, jobId } = await setup();
    const { conversationId } = await askQuestion(seeker.actor, { jobId, body: "1" });
    for (let i = 0; i < 29; i++) await sendMessage(seeker.actor, conversationId, `${i}`);
    await expect(sendMessage(seeker.actor, conversationId, "over")).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
    await expect(
      sendMessage(employer.actor, conversationId, "企業は送れる"),
    ).resolves.toBeDefined();
  });

  it("2000文字を超えるメッセージは送れない", async () => {
    const { seeker, jobId } = await setup();
    const { conversationId } = await askQuestion(seeker.actor, { jobId, body: "質問" });
    await expect(
      sendMessage(seeker.actor, conversationId, "あ".repeat(2001)),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });
});
