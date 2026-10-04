import "server-only";
import { recordAudit } from "@/server/audit";
import type { SessionUser } from "@/server/auth/session";
import { decryptMessage } from "@/server/crypto/message";
import { db } from "@/server/db";
import { systemText } from "./conversation";

/**
 * 求職者のデータの持ち出し（T065 / FR-045）。JSON で返す。
 * 本人のプロフィール・投稿・応募・本人が参加している会話のメッセージ・保存した条件・Axis エンジンの記録を含める。
 */
export async function exportSeekerData(actor: SessionUser) {
  const [user, profile, posts, applications, searches, conversations, axis] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: actor.userId },
      select: { email: true, createdAt: true, termsVersion: true, termsAcceptedAt: true },
    }),
    db.seekerProfile.findUnique({ where: { userId: actor.userId } }),
    db.seekerPost.findMany({ where: { seekerId: actor.userId }, orderBy: { createdAt: "asc" } }),
    db.application.findMany({
      where: { seekerId: actor.userId },
      include: { jobPost: { select: { id: true, title: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.savedSearch.findMany({ where: { seekerId: actor.userId } }),
    db.conversation.findMany({
      where: { seekerId: actor.userId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        employer: { select: { employerProfile: { select: { companyName: true } } } },
      },
    }),
    db.personalAxis.findUnique({
      where: { userId: actor.userId },
      include: {
        milestones: {
          include: {
            recordEntries: true,
            decisionRecords: { include: { options: true } },
            sessions: {
              include: {
                reflection: { include: { currentVersion: { include: { sections: true } } } },
              },
            },
          },
        },
      },
    }),
  ]);
  await recordAudit({ type: "AXIS_EXPORTED", actorUserId: actor.userId, axisId: axis?.id ?? null });

  return {
    exportedAt: new Date().toISOString(),
    account: user,
    profile,
    seekerPosts: posts,
    applications: applications.map((a) => ({
      job: a.jobPost,
      appliedAt: a.createdAt,
      sharedProfile: a.sharedProfile,
    })),
    savedSearches: searches.map((s) => ({ criteria: s.criteria, notify: s.notify })),
    conversations: conversations.map((c) => ({
      with: c.employer.employerProfile?.companyName ?? "企業",
      startedAt: c.createdAt,
      messages: c.messages.map((m) => ({
        at: m.createdAt,
        from: m.kind === "SYSTEM" ? "お知らせ" : m.senderId === actor.userId ? "自分" : "相手",
        body:
          m.kind === "SYSTEM"
            ? systemText(m.systemEvent, m.systemPayload)
            : m.bodyEncrypted
              ? decryptMessage(m.bodyEncrypted)
              : "",
      })),
    })),
    axisEngine: axis
      ? axis.milestones.map((ms) => ({
          kind: ms.kind,
          title: ms.title,
          startedAt: ms.startedAt,
          records: ms.recordEntries.map((r) => ({
            type: r.type,
            content: r.content,
            recordedAt: r.recordedAt,
          })),
          decisions: ms.decisionRecords,
          reflections: ms.sessions
            .map((s) =>
              s.reflection?.currentVersion?.sections.map((x) => ({
                aspect: x.aspect,
                content: x.content,
              })),
            )
            .filter(Boolean),
        }))
      : [],
  };
}
