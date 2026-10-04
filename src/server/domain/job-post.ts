import "server-only";
import type { JobPost } from "@/generated/prisma/client";
import { JOB_LISTING_DAYS } from "@/lib/master-data";
import { DomainError } from "@/lib/result";
import { recordAudit } from "@/server/audit";
import { assertCanAct } from "@/server/auth/guards";
import type { SessionUser } from "@/server/auth/session";
import {
  diffJob,
  type Issue,
  type JobDraft,
  JobDraftSchema,
  jobWarnings,
  type PublishConfirmations,
  validateForPublish,
} from "@/server/compliance/job-post";
import { db, type Tx } from "@/server/db";
import { enqueue, QUEUES } from "@/server/jobs";
import { authorizeBoard, NotFoundError } from "@/server/policy/board";
import { assertWithinLimit } from "@/server/rate-limit-db";
import { addSystemMessage, toBoardActor } from "./conversation";

/**
 * 求人（T027 / FR-008〜FR-016）
 *
 * DRAFT ──公開──▶ PUBLISHED ──募集終了──▶ CLOSED
 *                    │  ▲ 延長
 *       掲載期限切れ ▼  │
 *                  EXPIRED
 * PUBLISHED ──運営が非公開──▶ HIDDEN ──運営が解除──▶ PUBLISHED
 *
 * 運営は内容を書き換えない（FR-016）。内容を変えられるのは企業本人だけ。
 */

const DAY = 24 * 60 * 60 * 1000;
const DRAFT_KEYS = Object.keys(JobDraftSchema.shape) as (keyof JobDraft)[];

export class PublishValidationError extends DomainError {
  constructor(issues: Issue[]) {
    super("VALIDATION", "公開する前に、足りない項目・直すところがあります");
    this.name = "PublishValidationError";
    this.issues = issues;
  }
}

/** DB の行から、掲載ルールで扱う形（下書き）にする */
export function toDraft(job: JobPost): JobDraft {
  const raw = Object.fromEntries(
    DRAFT_KEYS.map((k) => [k, (job as Record<string, unknown>)[k] ?? null]),
  );
  return JobDraftSchema.parse({ ...raw, title: job.title ?? "", insurance: job.insurance ?? [] });
}

async function getOwnJob(actor: SessionUser, jobId: string, tx: Tx | typeof db = db) {
  const job = await tx.jobPost.findUnique({ where: { id: jobId } });
  authorizeBoard(toBoardActor(actor), "job.manage", {
    type: "job",
    employerId: job?.employerId ?? "",
  });
  if (!job) throw new NotFoundError();
  return job;
}

async function assertHasProfile(actor: SessionUser) {
  const profile = await db.employerProfile.findUnique({
    where: { userId: actor.userId },
    select: { id: true },
  });
  if (!profile) throw new DomainError("CONFLICT", "先に会社・お店のプロフィールを登録してください");
}

export async function getJobForEdit(actor: SessionUser, jobId: string) {
  const job = await getOwnJob(actor, jobId);
  const draft = toDraft(job);
  return { job, draft, issues: validateForPublish(draft), warnings: jobWarnings(draft) };
}

export async function listOwnJobs(actor: SessionUser) {
  if (actor.kind !== "EMPLOYER") throw new NotFoundError();
  return db.jobPost.findMany({
    where: { employerId: actor.userId },
    orderBy: [{ updatedAt: "desc" }],
    include: { _count: { select: { applications: true } } },
  });
}

async function writeRevision(tx: Tx, job: JobPost, draft: JobDraft, changedFields: string[]) {
  await tx.jobPostRevision.create({
    data: { jobPostId: job.id, version: job.version, snapshot: draft, changedFields },
  });
}

/**
 * 保存（T027）。新規・下書きは未入力があってもよい。
 * 公開中の求人は、公開できる状態のままであることを確かめてから保存し、新しい版を作る。
 * 応募者がいる求人の労働条件が変わったら、応募者に知らせる（FR-015）。
 */
export async function saveJob(actor: SessionUser, jobId: string | null, input: unknown) {
  assertCanAct(actor);
  if (actor.kind !== "EMPLOYER") throw new NotFoundError();
  await assertHasProfile(actor);
  const draft = JobDraftSchema.parse(input);

  if (!jobId) {
    const job = await db.jobPost.create({
      data: { ...draft, employerId: actor.userId, status: "DRAFT" },
    });
    return { jobId: job.id, version: job.version, notifiedApplicants: 0 };
  }

  const current = await getOwnJob(actor, jobId);
  if (current.status !== "PUBLISHED") {
    const job = await db.jobPost.update({ where: { id: jobId }, data: draft });
    return { jobId: job.id, version: job.version, notifiedApplicants: 0 };
  }

  const issues = validateForPublish(draft);
  if (issues.length > 0) throw new PublishValidationError(issues);
  const { changed, laborChanged } = diffJob(toDraft(current), draft);
  if (changed.length === 0) return { jobId, version: current.version, notifiedApplicants: 0 };

  return db.$transaction(async (tx) => {
    const job = await tx.jobPost.update({
      where: { id: jobId },
      data: { ...draft, version: { increment: 1 }, contentUpdatedAt: new Date() },
    });
    await writeRevision(tx, job, draft, changed);
    await recordAudit(
      {
        type: "JOB_UPDATED",
        actorUserId: actor.userId,
        metadata: { versionNo: job.version, itemCount: changed.length },
      },
      tx,
    );
    const notified =
      laborChanged.length > 0 ? await notifyApplicantsOfChange(tx, job, laborChanged) : 0;
    return { jobId, version: job.version, notifiedApplicants: notified };
  });
}

/** 応募者の会話にお知らせを入れ、メールを予約する（FR-015） */
async function notifyApplicantsOfChange(tx: Tx, job: JobPost, fields: string[]) {
  const applications = await tx.application.findMany({
    where: { jobPostId: job.id },
    select: { conversationId: true, seekerId: true },
  });
  for (const a of applications) {
    await addSystemMessage(tx, a.conversationId, "JOB_CONDITIONS_CHANGED", {
      jobPostId: job.id,
      title: job.title,
      fields,
    });
  }
  // メールはトランザクションの外で送れば十分（予約だけ）
  for (const a of applications) {
    await enqueue(QUEUES.jobChangeNotice, { jobPostId: job.id, seekerId: a.seekerId });
  }
  return applications.length;
}

/** 公開（FR-009〜FR-014）。下書き・募集終了・期限切れから公開できる */
export async function publishJob(
  actor: SessionUser,
  jobId: string,
  confirmations: PublishConfirmations,
) {
  assertCanAct(actor);
  await assertHasProfile(actor);
  const job = await getOwnJob(actor, jobId);
  if (job.status === "HIDDEN") {
    throw new DomainError(
      "CONFLICT",
      "運営が掲載を止めています。内容を直したうえで、お問い合わせ窓口に連絡してください",
    );
  }
  if (job.status === "PUBLISHED") return { jobId, expiresAt: job.expiresAt };

  const draft = toDraft(job);
  const issues = validateForPublish(draft, confirmations);
  if (issues.length > 0) throw new PublishValidationError(issues);
  await assertWithinLimit("jobPublish", actor.userId, actor.userId);

  const now = new Date();
  return db.$transaction(async (tx) => {
    const previous = await tx.jobPostRevision.findFirst({
      where: { jobPostId: jobId },
      orderBy: { version: "desc" },
    });
    const updated = await tx.jobPost.update({
      where: { id: jobId },
      data: {
        status: "PUBLISHED",
        version: { increment: 1 },
        complianceConfirmedAt: now,
        publishedAt: job.publishedAt ?? now,
        contentUpdatedAt: now,
        expiresAt: new Date(now.getTime() + JOB_LISTING_DAYS * DAY),
        closedAt: null,
      },
    });
    const changed = previous ? diffJob(previous.snapshot as Partial<JobDraft>, draft).changed : [];
    await writeRevision(tx, updated, draft, changed);
    await recordAudit(
      {
        type: "JOB_PUBLISHED",
        actorUserId: actor.userId,
        metadata: { versionNo: updated.version },
      },
      tx,
    );
    return { jobId, expiresAt: updated.expiresAt };
  });
}

/** 掲載期限の延長（今日から60日。期限切れの求人も再び公開する） */
export async function extendJob(actor: SessionUser, jobId: string) {
  assertCanAct(actor);
  const job = await getOwnJob(actor, jobId);
  if (job.status !== "PUBLISHED" && job.status !== "EXPIRED") {
    throw new DomainError("CONFLICT", "公開中または期限切れの求人だけ延長できます");
  }
  if (job.status === "EXPIRED") {
    const issues = validateForPublish(toDraft(job));
    if (issues.length > 0) throw new PublishValidationError(issues);
  }
  const expiresAt = new Date(Date.now() + JOB_LISTING_DAYS * DAY);
  await db.jobPost.update({
    where: { id: jobId },
    data: { status: "PUBLISHED", expiresAt, closedAt: null },
  });
  return { expiresAt };
}

/** 募集終了 */
export async function closeJob(actor: SessionUser, jobId: string) {
  const job = await getOwnJob(actor, jobId);
  if (job.status === "CLOSED") return;
  await db.$transaction(async (tx) => {
    await tx.jobPost.update({
      where: { id: jobId },
      data: { status: "CLOSED", closedAt: new Date() },
    });
    await recordAudit({ type: "JOB_CLOSED", actorUserId: actor.userId }, tx);
  });
}

/** 掲載期限を過ぎた求人を掲載終了にする（job-expiry ジョブ、毎時） */
export async function expireJobs(now = new Date()) {
  const expired = await db.jobPost.findMany({
    where: { status: "PUBLISHED", expiresAt: { lt: now } },
    select: { id: true, employerId: true },
  });
  if (expired.length === 0) return 0;
  await db.jobPost.updateMany({
    where: { id: { in: expired.map((j) => j.id) } },
    data: { status: "EXPIRED", closedAt: now },
  });
  for (const j of expired) await recordAudit({ type: "JOB_EXPIRED", actorUserId: j.employerId });
  return expired.length;
}

/** 公開ページ用。公開中・終了・期限切れは表示（応募は公開中のみ）、下書き・非公開は 404 */
export async function getPublicJob(jobId: string) {
  const job = await db.jobPost.findFirst({
    where: {
      id: jobId,
      status: { in: ["PUBLISHED", "CLOSED", "EXPIRED"] },
      employer: { deletedAt: null, suspendedAt: null },
    },
    include: { employer: { select: { id: true, employerProfile: true } } },
  });
  if (!job || !job.publishedAt) return null;
  const open = job.status === "PUBLISHED" && (!job.expiresAt || job.expiresAt > new Date());
  return { job, open };
}

export function isOpen(job: Pick<JobPost, "status" | "expiresAt">) {
  return job.status === "PUBLISHED" && (!job.expiresAt || job.expiresAt > new Date());
}
