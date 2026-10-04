/**
 * 求人の状態遷移と公開ルールの結合テスト（T025 / FR-009〜FR-016）
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  closeJob,
  expireJobs,
  extendJob,
  getPublicJob,
  publishJob,
  saveJob,
} from "@/server/domain/job-post";
import { canBoard } from "@/server/policy/board";
import { db, resetDb } from "../helpers/db";
import { createEmployer, createOperator } from "../helpers/factories";
import { completeJob } from "../helpers/job-fixtures";

const ok = { truthful: true, lawful: true, noLaborDispute: true };
const DAY = 24 * 60 * 60 * 1000;

describe("求人の公開と状態遷移", () => {
  beforeEach(resetDb);

  it("必須項目が欠けていると公開できず、足りない項目が返る", async () => {
    const { actor } = await createEmployer();
    const { jobId } = await saveJob(actor, null, { ...completeJob(), holidaysText: null });
    await expect(publishJob(actor, jobId, ok)).rejects.toMatchObject({
      code: "VALIDATION",
      issues: expect.arrayContaining([expect.objectContaining({ field: "holidaysText" })]),
    });
  });

  it("性別を限定する表現があると公開できない", async () => {
    const { actor } = await createEmployer();
    const { jobId } = await saveJob(
      actor,
      null,
      completeJob({ jobDescription: "女性限定の職場です" }),
    );
    await expect(publishJob(actor, jobId, ok)).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("確認事項がそろわないと公開できない", async () => {
    const { actor } = await createEmployer();
    const { jobId } = await saveJob(actor, null, completeJob());
    await expect(publishJob(actor, jobId, { ...ok, lawful: false })).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });

  it("公開すると版1・掲載日・最終更新日・60日後の掲載期限が入り、版の履歴が残る", async () => {
    const { actor } = await createEmployer();
    const { jobId } = await saveJob(actor, null, completeJob());
    await publishJob(actor, jobId, ok);
    const job = await db.jobPost.findUniqueOrThrow({
      where: { id: jobId },
      include: { revisions: true },
    });
    expect(job.status).toBe("PUBLISHED");
    expect(job.version).toBe(1);
    expect(job.publishedAt).not.toBeNull();
    expect(job.contentUpdatedAt).not.toBeNull();
    expect(Math.round(((job.expiresAt?.getTime() ?? 0) - Date.now()) / DAY)).toBe(60);
    expect(job.revisions).toHaveLength(1);
  });

  it("公開中の求人を更新すると版が増え、変わった項目が履歴に残る", async () => {
    const { actor } = await createEmployer();
    const { jobId } = await saveJob(actor, null, completeJob());
    await publishJob(actor, jobId, ok);
    const result = await saveJob(actor, jobId, completeJob({ salaryMin: 1500 }));
    expect(result.version).toBe(2);
    const rev = await db.jobPostRevision.findUniqueOrThrow({
      where: { jobPostId_version: { jobPostId: jobId, version: 2 } },
    });
    expect(rev.changedFields).toEqual(["salaryMin"]);
  });

  it("公開中の求人を、ルールに反する内容には更新できない", async () => {
    const { actor } = await createEmployer();
    const { jobId } = await saveJob(actor, null, completeJob());
    await publishJob(actor, jobId, ok);
    await expect(
      saveJob(actor, jobId, completeJob({ title: "男性のみ募集" })),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("掲載期限を過ぎると期限切れになり、延長すると再び公開される", async () => {
    const { actor } = await createEmployer();
    const { jobId } = await saveJob(actor, null, completeJob());
    await publishJob(actor, jobId, ok);
    await db.jobPost.update({
      where: { id: jobId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await expireJobs()).toBe(1);
    expect((await db.jobPost.findUniqueOrThrow({ where: { id: jobId } })).status).toBe("EXPIRED");
    expect((await getPublicJob(jobId))?.open).toBe(false);
    await extendJob(actor, jobId);
    expect((await getPublicJob(jobId))?.open).toBe(true);
  });

  it("募集を終了すると応募できない状態になる", async () => {
    const { actor } = await createEmployer();
    const { jobId } = await saveJob(actor, null, completeJob());
    await publishJob(actor, jobId, ok);
    await closeJob(actor, jobId);
    expect((await getPublicJob(jobId))?.open).toBe(false);
  });

  it("他社の求人は編集できない", async () => {
    const a = await createEmployer("A社");
    const b = await createEmployer("B社");
    const { jobId } = await saveJob(a.actor, null, completeJob());
    await expect(saveJob(b.actor, jobId, completeJob())).rejects.toThrow();
  });

  it("運営は求人の内容を変える権限を持たない（FR-016）", async () => {
    const op = await createOperator();
    const a = await createEmployer();
    expect(
      canBoard({ ...op.actor, kind: "STAFF" }, "job.manage", {
        type: "job",
        employerId: a.user.id,
      }),
    ).toBe(false);
  });

  it("下書き・非公開の求人は公開ページに出ない", async () => {
    const { actor } = await createEmployer();
    const { jobId } = await saveJob(actor, null, completeJob());
    expect(await getPublicJob(jobId)).toBeNull();
  });
});
