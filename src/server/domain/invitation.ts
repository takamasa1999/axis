import "server-only";
import { env } from "@/lib/env";
import { DomainError } from "@/lib/result";
import { generateToken, hashToken, maskEmail } from "@/lib/tokens";
import { recordAudit } from "@/server/audit";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { invitationMail, sendMail } from "@/server/mail";
import { checkRateLimit } from "@/server/rate-limit";

const INVITATION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/** 案内リンクの表示用の情報（有効でなければ null） */
export async function findValidInvitation(token: string) {
  const invitation = await db.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { agency: { select: { name: true } } },
  });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) return null;
  return {
    agencyName: invitation.agency.name,
    maskedEmail: invitation.email ? maskEmail(invitation.email) : null,
  };
}

/**
 * 利用案内の受け入れ（001 / T038。002 でメールアドレス＋パスワードのログインに合わせて変更）。
 * ログイン中の本人（PERSON）の Axis を、案内を送った紹介会社とつなぐ。本人のアカウントは紹介会社から独立している（原則V）。
 */
export async function acceptInvitation(
  actor: SessionUser,
  token: string,
): Promise<{ agencyName: string }> {
  if (actor.kind !== "PERSON" || !actor.axisId) {
    throw new DomainError("NOT_FOUND", "求職者のアカウントでログインしてください");
  }
  const axisId = actor.axisId;
  const invitation = await db.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { agency: { select: { name: true } } },
  });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    throw new DomainError("NOT_FOUND", "このご案内は無効か、有効期限が切れています");
  }

  await db.$transaction(async (tx) => {
    const relationship = await tx.agencyRelationship.upsert({
      where: { axisId_agencyId: { axisId, agencyId: invitation.agencyId } },
      // 一度終了した関係でも、新しい案内を受け入れたら再開する（共有の許可は引き継がない）
      update: {
        invitationId: invitation.id,
        assignedCaId: invitation.assignedCaId,
        status: "ACTIVE",
        endedAt: null,
        endedBy: null,
      },
      create: {
        axisId,
        agencyId: invitation.agencyId,
        assignedCaId: invitation.assignedCaId,
        invitationId: invitation.id,
        status: "ACTIVE",
      },
    });
    // 受け入れ後はメールアドレスを案内に残さない
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date(), email: null },
    });
    await recordAudit(
      {
        type: "INVITATION_ACCEPTED",
        actorUserId: actor.userId,
        axisId,
        agencyId: invitation.agencyId,
        metadata: { invitationId: invitation.id, relationshipId: relationship.id },
      },
      tx,
    );
  });
  return { agencyName: invitation.agency.name };
}

/** 利用案内の送信（T054 / FR-028）。CA・管理者が使う */
export async function sendInvitation(
  actor: SessionUser,
  input: { agencyId: string; email: string; assignedCaId: string | null },
) {
  const membership = actor.memberships.find((m) => m.agencyId === input.agencyId);
  if (!membership) throw new DomainError("NOT_FOUND", "見つかりませんでした");

  if (input.assignedCaId) {
    const ca = await db.agencyMember.findFirst({
      where: { id: input.assignedCaId, agencyId: input.agencyId, role: "CA", active: true },
    });
    if (!ca) throw new DomainError("VALIDATION", "担当CAが見つかりません");
  }

  if (!checkRateLimit("invitation", input.agencyId).allowed) {
    throw new DomainError("RATE_LIMITED", "本日の案内の上限に達しました");
  }

  const { token, tokenHash } = generateToken();
  const agency = await db.agency.findUniqueOrThrow({ where: { id: input.agencyId } });
  const invitation = await db.invitation.create({
    data: {
      agencyId: input.agencyId,
      createdByMemberId: membership.memberId,
      assignedCaId: input.assignedCaId,
      email: input.email.toLowerCase(),
      tokenHash,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    },
  });

  await sendMail(invitationMail(input.email, `${env().APP_URL}/invite/${token}`, agency.name));
  await recordAudit({
    type: "INVITATION_SENT",
    actorUserId: actor.userId,
    agencyId: input.agencyId,
    metadata: { invitationId: invitation.id },
  });
  return { invitationId: invitation.id };
}
