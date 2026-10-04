import "server-only";
import type { ReportStatus } from "@/generated/prisma/enums";
import { env } from "@/lib/env";
import { DomainError } from "@/lib/result";
import { recordAudit } from "@/server/audit";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { jobFixRequestMail, sendMail } from "@/server/mail";
import { authorizeBoard } from "@/server/policy/board";
import { toBoardActor } from "./conversation";

/**
 * 運営の対応（T059 / FR-016, FR-035, FR-036）。
 * - 運営は求人の内容を書き換えない。できるのは修正依頼・非公開・解除だけ
 * - 運営は会話を読めない。通報の詳細で見られるメッセージは、通報者が提出したものだけ
 * - すべての対応を ModerationAction と操作履歴に残す
 */

function assertOperator(op: SessionUser) {
  authorizeBoard(toBoardActor(op), "moderation.handle");
}

const DAY = 24 * 60 * 60 * 1000;

async function firstHandle(reportId: string | undefined) {
  if (!reportId) return;
  await db.report.updateMany({
    where: { id: reportId, firstHandledAt: null },
    data: { firstHandledAt: new Date(), status: "IN_REVIEW" },
  });
}

// ---------------- 通報 ----------------

export async function listReports(op: SessionUser, status?: ReportStatus) {
  assertOperator(op);
  return db.report.findMany({
    where: status ? { status } : { status: { in: ["OPEN", "IN_REVIEW"] } },
    orderBy: { receivedAt: "asc" },
    take: 200,
    include: { _count: { select: { evidence: true } } },
  });
}

/** 通報の詳細。対象の概要と、通報者が提出したメッセージだけを返す */
export async function getReportDetail(op: SessionUser, reportId: string) {
  assertOperator(op);
  const report = await db.report.findUnique({
    where: { id: reportId },
    include: {
      evidence: { orderBy: { sentAt: "asc" } },
      moderationActions: { orderBy: { createdAt: "asc" } },
      reporter: { select: { id: true, kind: true, email: true } },
    },
  });
  if (!report) throw new DomainError("NOT_FOUND", "見つかりませんでした");

  let target: { label: string; href?: string; ownerId?: string } = { label: "" };
  if (report.targetType === "JOB_POST") {
    const job = await db.jobPost.findUnique({
      where: { id: report.targetId },
      select: { id: true, title: true, employerId: true, status: true },
    });
    target = {
      label: `求人「${job?.title ?? "（削除済み）"}」（${job?.status ?? "-"}）`,
      href: `/ops/jobs/${report.targetId}`,
      ownerId: job?.employerId,
    };
  } else if (report.targetType === "SEEKER_POST") {
    const post = await db.seekerPost.findUnique({
      where: { id: report.targetId },
      select: { title: true, body: true, seekerId: true, status: true },
    });
    target = {
      label: `求職の投稿「${post?.title ?? "（削除済み）"}」（${post?.status ?? "-"}）：${post?.body ?? ""}`,
      ownerId: post?.seekerId,
    };
  } else if (report.targetType === "USER") {
    target = {
      label: "アカウント",
      href: `/ops/users/${report.targetId}`,
      ownerId: report.targetId,
    };
  } else {
    // MESSAGE：targetId は会話の ID。相手のアカウントだけを示し、会話そのものは開かない
    const c = await db.conversation.findUnique({
      where: { id: report.targetId },
      select: { seekerId: true, employerId: true },
    });
    const counterpart = c
      ? c.seekerId === report.reporterId
        ? c.employerId
        : c.seekerId
      : undefined;
    target = {
      label: "メッセージ（提出されたもののみ表示）",
      href: counterpart ? `/ops/users/${counterpart}` : undefined,
      ownerId: counterpart,
    };
  }
  return { report, target };
}

export async function setReportStatus(
  op: SessionUser,
  reportId: string,
  status: "IN_REVIEW" | "RESOLVED" | "DISMISSED",
  note?: string,
) {
  assertOperator(op);
  const now = new Date();
  await db.report.update({
    where: { id: reportId },
    data: {
      status,
      resolutionNote: note ?? undefined,
      ...(status === "IN_REVIEW" ? {} : { resolvedAt: now }),
    },
  });
  await db.report.updateMany({
    where: { id: reportId, firstHandledAt: null },
    data: { firstHandledAt: now },
  });
}

// ---------------- 求人 ----------------

/** 確認用の求人（読み取りのみ。運営は内容を変更しない） */
export async function getJobForReview(op: SessionUser, jobId: string) {
  assertOperator(op);
  const job = await db.jobPost.findUnique({
    where: { id: jobId },
    include: {
      employer: { select: { id: true, email: true, employerProfile: true, suspendedAt: true } },
      revisions: { orderBy: { version: "desc" }, take: 5 },
    },
  });
  if (!job) throw new DomainError("NOT_FOUND", "見つかりませんでした");
  const actions = await db.moderationAction.findMany({
    where: { targetType: "JOB_POST", targetId: jobId },
    orderBy: { createdAt: "desc" },
  });
  return { job, actions };
}

/** 修正の依頼（指針 第三の二(一)）。企業にメールと画面で知らせる */
export async function requestJobFix(
  op: SessionUser,
  input: { jobId: string; reason: string; days?: number; reportId?: string },
) {
  assertOperator(op);
  const job = await db.jobPost.findUnique({
    where: { id: input.jobId },
    include: { employer: { select: { email: true } } },
  });
  if (!job) throw new DomainError("NOT_FOUND", "見つかりませんでした");
  const fixDeadline = new Date(Date.now() + (input.days ?? 3) * DAY);
  await db.$transaction(async (tx) => {
    await tx.moderationAction.create({
      data: {
        operatorId: op.userId,
        targetType: "JOB_POST",
        targetId: job.id,
        action: "REQUEST_FIX",
        reason: input.reason,
        fixDeadline,
        reportId: input.reportId ?? null,
      },
    });
    await recordAudit({ type: "MODERATION_ACTION", actorUserId: op.userId }, tx);
  });
  await firstHandle(input.reportId);
  await sendMail(
    jobFixRequestMail(
      job.employer.email,
      `${env().APP_URL}/employer/jobs/${job.id}/edit`,
      job.title,
      input.reason,
      fixDeadline,
    ),
  );
  return { fixDeadline };
}

export async function hideJob(
  op: SessionUser,
  input: { jobId: string; reason: string; reportId?: string },
) {
  assertOperator(op);
  await db.$transaction(async (tx) => {
    await tx.jobPost.update({
      where: { id: input.jobId },
      data: { status: "HIDDEN", hiddenAt: new Date(), hiddenReason: input.reason },
    });
    await tx.moderationAction.create({
      data: {
        operatorId: op.userId,
        targetType: "JOB_POST",
        targetId: input.jobId,
        action: "HIDE",
        reason: input.reason,
        reportId: input.reportId ?? null,
      },
    });
    await recordAudit({ type: "MODERATION_ACTION", actorUserId: op.userId }, tx);
  });
  await firstHandle(input.reportId);
}

export async function unhideJob(op: SessionUser, input: { jobId: string; reason: string }) {
  assertOperator(op);
  const job = await db.jobPost.findUnique({ where: { id: input.jobId } });
  if (!job || job.status !== "HIDDEN")
    throw new DomainError("CONFLICT", "非公開の求人ではありません");
  const stillValid = job.expiresAt && job.expiresAt > new Date();
  await db.$transaction(async (tx) => {
    await tx.jobPost.update({
      where: { id: job.id },
      data: { status: stillValid ? "PUBLISHED" : "EXPIRED", hiddenAt: null, hiddenReason: null },
    });
    await tx.moderationAction.create({
      data: {
        operatorId: op.userId,
        targetType: "JOB_POST",
        targetId: job.id,
        action: "UNHIDE",
        reason: input.reason,
      },
    });
    await recordAudit({ type: "MODERATION_ACTION", actorUserId: op.userId }, tx);
  });
}

export async function hideSeekerPost(
  op: SessionUser,
  input: { postId: string; reason: string; reportId?: string },
) {
  assertOperator(op);
  await db.$transaction(async (tx) => {
    await tx.seekerPost.update({ where: { id: input.postId }, data: { status: "HIDDEN" } });
    await tx.moderationAction.create({
      data: {
        operatorId: op.userId,
        targetType: "SEEKER_POST",
        targetId: input.postId,
        action: "HIDE",
        reason: input.reason,
        reportId: input.reportId ?? null,
      },
    });
    await recordAudit({ type: "MODERATION_ACTION", actorUserId: op.userId }, tx);
  });
  await firstHandle(input.reportId);
}

// ---------------- アカウント ----------------

/** アカウントの確認用（メッセージの内容は返さない） */
export async function getUserForReview(op: SessionUser, userId: string) {
  assertOperator(op);
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      kind: true,
      createdAt: true,
      suspendedAt: true,
      suspendedReason: true,
      deletedAt: true,
      employerProfile: { select: { companyName: true } },
      seekerProfile: { select: { displayName: true } },
      _count: { select: { jobPosts: true, seekerPosts: true, messagesSent: true, reports: true } },
    },
  });
  if (!user) throw new DomainError("NOT_FOUND", "見つかりませんでした");
  const [reportedCount, actions] = await Promise.all([
    db.report.count({ where: { targetType: "USER", targetId: userId } }),
    db.moderationAction.findMany({
      where: { targetType: "USER", targetId: userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { user, reportedCount, actions };
}

export async function suspendUser(
  op: SessionUser,
  input: { userId: string; reason: string; reportId?: string },
) {
  assertOperator(op);
  if (input.userId === op.userId)
    throw new DomainError("CONFLICT", "自分のアカウントは停止できません");
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { suspendedAt: new Date(), suspendedReason: input.reason },
    });
    await tx.moderationAction.create({
      data: {
        operatorId: op.userId,
        targetType: "USER",
        targetId: input.userId,
        action: "SUSPEND",
        reason: input.reason,
        reportId: input.reportId ?? null,
      },
    });
    await recordAudit({ type: "MODERATION_ACTION", actorUserId: op.userId }, tx);
  });
  await firstHandle(input.reportId);
}

export async function unsuspendUser(op: SessionUser, input: { userId: string; reason: string }) {
  assertOperator(op);
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { suspendedAt: null, suspendedReason: null },
    });
    await tx.moderationAction.create({
      data: {
        operatorId: op.userId,
        targetType: "USER",
        targetId: input.userId,
        action: "UNSUSPEND",
        reason: input.reason,
      },
    });
    await recordAudit({ type: "MODERATION_ACTION", actorUserId: op.userId }, tx);
  });
}

// ---------------- ダッシュボード ----------------

export async function opsSummary(op: SessionUser) {
  assertOperator(op);
  const [openReports, openInquiries, overdueFixes, rateLimited] = await Promise.all([
    db.report.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
    db.inquiry.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.moderationAction.findMany({
      where: { action: "REQUEST_FIX", fixDeadline: { lt: new Date() } },
      orderBy: { fixDeadline: "asc" },
      take: 20,
    }),
    db.auditEvent.count({
      where: { type: "RATE_LIMITED", occurredAt: { gt: new Date(Date.now() - DAY) } },
    }),
  ]);
  // 期限切れの修正依頼のうち、依頼のあとに求人が更新されておらず、まだ公開中のもの
  const overdue = [];
  for (const a of overdueFixes) {
    const job = await db.jobPost.findUnique({
      where: { id: a.targetId },
      select: { id: true, title: true, status: true, contentUpdatedAt: true },
    });
    if (
      job &&
      job.status === "PUBLISHED" &&
      (!job.contentUpdatedAt || job.contentUpdatedAt < a.createdAt)
    )
      overdue.push({ action: a, job });
  }
  return { openReports, openInquiries, overdue, rateLimited };
}
