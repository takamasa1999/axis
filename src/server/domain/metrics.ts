import "server-only";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { authorizeBoard } from "@/server/policy/board";
import { toBoardActor } from "./conversation";

/**
 * 事業概況報告などに使う集計（T061 / FR-038）。件数だけを返し、個人の内容は含めない。
 * 期間は [from, to) 。
 */
export async function boardMetrics(op: SessionUser, from: Date, to: Date) {
  authorizeBoard(toBoardActor(op), "metrics.view");
  const range = { gte: from, lt: to };
  const [
    jobsPublished,
    jobsOpenNow,
    seekersRegistered,
    employersRegistered,
    applications,
    conversations,
    seekerPosts,
    reports,
    inquiries,
    moderation,
  ] = await Promise.all([
    db.jobPost.count({ where: { publishedAt: range } }),
    db.jobPost.count({ where: { status: "PUBLISHED", expiresAt: { gt: new Date() } } }),
    db.user.count({ where: { kind: "PERSON", createdAt: range } }),
    db.user.count({ where: { kind: "EMPLOYER", createdAt: range } }),
    db.application.count({ where: { createdAt: range } }),
    db.conversation.count({ where: { createdAt: range } }),
    db.seekerPost.count({ where: { publishedAt: range } }),
    db.report.count({ where: { receivedAt: range } }),
    db.inquiry.count({ where: { receivedAt: range } }),
    db.moderationAction.count({ where: { createdAt: range } }),
  ]);
  return {
    jobsPublished,
    jobsOpenNow,
    seekersRegistered,
    employersRegistered,
    applications,
    conversations,
    seekerPosts,
    reports,
    inquiries,
    moderation,
  };
}
