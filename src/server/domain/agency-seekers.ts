import "server-only";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db";

export type SeekerStatus =
  | "REGISTERED" // 登録済み（対話前）
  | "IN_DIALOGUE" // 対話中
  | "INCOMPLETE" // 未完了（中断・停止）
  | "AWAITING_CONSENT" // 対話完了・許可待ち
  | "SHARED" // 共有あり
  | "REVOKED" // 取り消し
  | "ENDED"; // 関係終了

export const SEEKER_STATUS_LABEL: Record<SeekerStatus, string> = {
  REGISTERED: "登録済み",
  IN_DIALOGUE: "対話中",
  INCOMPLETE: "未完了",
  AWAITING_CONSENT: "許可待ち",
  SHARED: "共有あり",
  REVOKED: "取り消し",
  ENDED: "終了",
};

/**
 * 担当求職者の一覧（T055 / FR-025, FR-026）。
 * 状態だけを判定し、本人の対話・整理結果の内容は読まない。
 * CA は自分の担当のみ、管理者は自社の全員。
 */
export async function listSeekers(actor: SessionUser) {
  if (actor.kind !== "STAFF") return [];
  const adminAgencyIds = actor.memberships.filter((m) => m.role === "ADMIN").map((m) => m.agencyId);
  const caMemberIds = actor.memberships.filter((m) => m.role === "CA").map((m) => m.memberId);

  const relationships = await db.agencyRelationship.findMany({
    where: {
      OR: [{ agencyId: { in: adminAgencyIds } }, { assignedCaId: { in: caMemberIds } }],
      axis: { user: { deletedAt: null } },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      agency: { select: { name: true } },
      assignedCa: { select: { user: { select: { name: true } } } },
      consents: { select: { revokedAt: true, supersededAt: true, grantedAt: true } },
      axis: {
        select: {
          user: { select: { email: true } },
          milestones: {
            select: { sessions: { select: { status: true } } },
          },
        },
      },
    },
  });

  return relationships.map((r) => {
    const statuses = r.axis.milestones.flatMap((m) => m.sessions.map((s) => s.status));
    const active = r.consents.find((c) => !c.revokedAt && !c.supersededAt);
    let status: SeekerStatus;
    if (r.status === "ENDED") status = "ENDED";
    else if (active) status = "SHARED";
    else if (r.consents.some((c) => c.revokedAt)) status = "REVOKED";
    else if (statuses.includes("COMPLETED")) status = "AWAITING_CONSENT";
    else if (statuses.includes("IN_PROGRESS")) status = "IN_DIALOGUE";
    // 安全停止（SAFETY_STOPPED）は「未完了」として扱い、理由は紹介会社に伝えない
    else if (statuses.length > 0) status = "INCOMPLETE";
    else status = "REGISTERED";

    return {
      relationshipId: r.id,
      // 本人を識別するため、紹介会社が案内を送ったメールアドレスだけを表示する
      email: r.axis.user.email,
      agencyName: r.agency.name,
      assignedCaName: r.assignedCa?.user.name ?? null,
      status,
      sharedAt: active?.grantedAt ?? null,
    };
  });
}

/** 送信済みで、まだ受け入れられていない利用案内 */
export async function listPendingInvitations(actor: SessionUser) {
  if (actor.kind !== "STAFF") return [];
  const adminAgencyIds = actor.memberships.filter((m) => m.role === "ADMIN").map((m) => m.agencyId);
  const memberIds = actor.memberships.map((m) => m.memberId);
  return db.invitation.findMany({
    where: {
      acceptedAt: null,
      expiresAt: { gt: new Date() },
      OR: [
        { agencyId: { in: adminAgencyIds } },
        { createdByMemberId: { in: memberIds } },
        { assignedCaId: { in: memberIds } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, createdAt: true, expiresAt: true },
  });
}

/** 利用案内の送信先として選べる、自社の CA */
export async function listAgencyCas(agencyId: string) {
  return db.agencyMember.findMany({
    where: { agencyId, role: "CA", active: true },
    select: { id: true, user: { select: { name: true, email: true } } },
  });
}
