import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import type { AgencyRole, UserKind } from "@/generated/prisma/enums";
import { auth } from "@/server/auth";
import { db } from "@/server/db";

export type Membership = {
  memberId: string;
  agencyId: string;
  role: AgencyRole;
};

/** 権限判定（policy）に渡す「誰が操作しているか」 */
export type SessionUser = {
  userId: string;
  kind: UserKind;
  isOperator: boolean;
  /** PERSON のときだけ入る */
  axisId: string | null;
  /** STAFF のときの所属（有効なものだけ） */
  memberships: Membership[];
  twoFactorEnabled: boolean;
  /** 002：メール確認済みか（未確認なら投稿・応募・メッセージ送信ができない） */
  emailVerified: boolean;
  /** 002：運営による利用停止中か */
  suspended: boolean;
  email: string;
};

/**
 * 現在ログインしている利用者を取得する（T017）。
 * 未ログイン・退会済みなら null。1リクエストの中では結果を使い回す。
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return loadSessionUser(session.user.id);
});

export async function loadSessionUser(userId: string): Promise<SessionUser | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      kind: true,
      isOperator: true,
      deletedAt: true,
      twoFactorEnabled: true,
      emailVerified: true,
      suspendedAt: true,
      email: true,
      personalAxis: { select: { id: true } },
      memberships: {
        where: { active: true },
        select: { id: true, agencyId: true, role: true },
      },
    },
  });
  if (!user || user.deletedAt) return null;

  return {
    userId: user.id,
    kind: user.kind,
    isOperator: user.isOperator,
    axisId: user.kind === "PERSON" ? (user.personalAxis?.id ?? null) : null,
    memberships:
      user.kind === "STAFF"
        ? user.memberships.map((m) => ({ memberId: m.id, agencyId: m.agencyId, role: m.role }))
        : [],
    twoFactorEnabled: user.twoFactorEnabled ?? false,
    emailVerified: user.emailVerified,
    suspended: user.suspendedAt !== null,
    email: user.email,
  };
}
