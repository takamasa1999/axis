import "server-only";
import { DomainError } from "@/lib/result";
import { recordAudit } from "@/server/audit";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { authorizeBoard } from "@/server/policy/board";
import { toBoardActor } from "./conversation";

/**
 * 追加機能の利用権（T066 / FR-041）。当面は運営が手動で付与する（料金の受け取り方は未決のため決済はない）。
 * 利用権が切れても、Axis エンジンで作った記録は消さない（原則V）。
 */
export async function hasEntitlement(userId: string, feature: "AXIS_ENGINE" = "AXIS_ENGINE") {
  const now = new Date();
  const e = await db.featureEntitlement.findFirst({
    where: {
      userId,
      feature,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    select: { id: true },
  });
  return e !== null;
}

export async function listEntitlements(op: SessionUser) {
  authorizeBoard(toBoardActor(op), "entitlement.grant");
  return db.featureEntitlement.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { email: true, seekerProfile: { select: { displayName: true } } } },
    },
  });
}

export async function grantEntitlement(
  op: SessionUser,
  input: { email: string; endsAt: Date | null },
) {
  authorizeBoard(toBoardActor(op), "entitlement.grant");
  const user = await db.user.findUnique({
    where: { email: input.email.toLowerCase() },
    select: { id: true, kind: true, deletedAt: true },
  });
  if (!user || user.deletedAt)
    throw new DomainError("NOT_FOUND", "そのメールアドレスの利用者が見つかりません");
  if (user.kind !== "PERSON")
    throw new DomainError("VALIDATION", "Axis エンジンは求職者のアカウントだけが使えます");
  await db.$transaction(async (tx) => {
    await tx.featureEntitlement.create({
      data: {
        userId: user.id,
        feature: "AXIS_ENGINE",
        endsAt: input.endsAt,
        source: "MANUAL",
        grantedById: op.userId,
      },
    });
    // Axis エンジンの記録の入れ物がなければ作る
    await tx.personalAxis.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
    await recordAudit({ type: "ENTITLEMENT_GRANTED", actorUserId: op.userId }, tx);
  });
}

export async function endEntitlement(op: SessionUser, entitlementId: string) {
  authorizeBoard(toBoardActor(op), "entitlement.grant");
  await db.featureEntitlement.update({
    where: { id: entitlementId },
    data: { endsAt: new Date() },
  });
}
