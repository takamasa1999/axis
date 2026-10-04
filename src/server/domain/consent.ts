import "server-only";
import { ASPECT_LABEL } from "@/lib/labels";
import { DomainError } from "@/lib/result";
import { recordAudit } from "@/server/audit";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { authorize, NotFoundError } from "@/server/policy";

/** 本人の、ACTIVE な紹介会社との関係 */
export async function listActiveRelationships(actor: SessionUser) {
  if (!actor.axisId) throw new NotFoundError();
  authorize(actor, "axis.readWrite", { type: "axis", axisId: actor.axisId });
  return db.agencyRelationship.findMany({
    where: { axisId: actor.axisId, status: "ACTIVE" },
    include: { agency: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

async function getOwnedRelationship(actor: SessionUser, relationshipId: string) {
  const rel = await db.agencyRelationship.findUnique({
    where: { id: relationshipId },
    include: { agency: { select: { name: true } } },
  });
  if (!rel) throw new NotFoundError();
  authorize(actor, "consent.manage", {
    type: "relationship",
    axisId: rel.axisId,
    agencyId: rel.agencyId,
    assignedCaId: rel.assignedCaId,
  });
  return rel;
}

/**
 * 共有の候補（いまの版の項目）と、相手に見える形への変換（FR-017, FR-018, FR-023）。
 * 既定ではどの項目も選ばない。機微な項目には注意書きを付ける。
 */
export async function getShareCandidates(
  actor: SessionUser,
  relationshipId: string,
  milestoneId: string,
) {
  const rel = await getOwnedRelationship(actor, relationshipId);
  const summary = await db.reflectionSummary.findFirst({
    where: { session: { milestoneId, milestone: { axisId: rel.axisId } } },
    orderBy: { session: { completedAt: "desc" } },
    include: { currentVersion: { include: { sections: true } } },
  });
  if (!summary?.currentVersion) return null;

  const active = await db.sharingConsent.findFirst({
    where: { relationshipId, revokedAt: null, supersededAt: null },
    include: { snapshot: { include: { items: { orderBy: { order: "asc" } } } } },
  });

  return {
    agencyName: rel.agency.name,
    versionId: summary.currentVersion.id,
    versionNo: summary.currentVersion.versionNo,
    candidates: summary.currentVersion.sections.map((s) => ({
      id: s.id,
      label: ASPECT_LABEL[s.aspect],
      content: s.content,
      isSensitive: s.isSensitive,
    })),
    activeConsent: active
      ? {
          id: active.id,
          grantedAt: active.grantedAt,
          sameVersion: active.reflectionVersionId === summary.currentVersion.id,
          items: active.snapshot?.items ?? [],
        }
      : null,
  };
}

/**
 * 共有を許可する（T048 / FR-017〜FR-021）。
 * - 0件では許可できない
 * - 確認画面で見ていた版（versionId）が最新の版であること
 * - 以前の有効な許可には supersededAt を入れ、新しい許可を supersedesId 付きで作る
 * - 許可した時点の内容をスナップショットとしてコピーする（CA はこれだけを読む）
 */
export async function grantConsent(
  actor: SessionUser,
  input: { relationshipId: string; versionId: string; itemIds: string[] },
) {
  const rel = await getOwnedRelationship(actor, input.relationshipId);
  if (rel.status !== "ACTIVE")
    throw new DomainError("CONFLICT", "この紹介会社との関係は終了しています");
  if (input.itemIds.length === 0) {
    throw new DomainError("VALIDATION", "共有する項目を1つ以上選んでください");
  }

  const version = await db.reflectionVersion.findUnique({
    where: { id: input.versionId },
    include: {
      sections: true,
      currentOf: { select: { id: true } },
      summary: { select: { session: { select: { milestone: { select: { axisId: true } } } } } },
    },
  });
  if (!version || version.summary.session.milestone.axisId !== rel.axisId)
    throw new NotFoundError();
  if (!version.currentOf) {
    throw new DomainError("CONFLICT", "整理結果が更新されています。内容を確認し直してください");
  }

  const selected = version.sections.filter((s) => input.itemIds.includes(s.id));
  if (selected.length !== input.itemIds.length)
    throw new DomainError("VALIDATION", "項目が見つかりません");

  return db.$transaction(async (tx) => {
    const previous = await tx.sharingConsent.findFirst({
      where: { relationshipId: rel.id, revokedAt: null, supersededAt: null },
    });
    if (previous) {
      await tx.sharingConsent.update({
        where: { id: previous.id },
        data: { supersededAt: new Date() },
      });
    }
    const consent = await tx.sharingConsent.create({
      data: {
        relationshipId: rel.id,
        reflectionVersionId: version.id,
        supersedesId: previous?.id ?? null,
        snapshot: {
          create: {
            items: {
              create: selected.map((s, i) => ({
                sourceKind: "REFLECTION_SECTION" as const,
                label: ASPECT_LABEL[s.aspect],
                content: s.content,
                order: i,
              })),
            },
          },
        },
      },
    });
    const base = { actorUserId: actor.userId, axisId: rel.axisId, agencyId: rel.agencyId };
    if (previous) {
      await recordAudit(
        {
          ...base,
          type: "CONSENT_SUPERSEDED",
          metadata: { relationshipId: rel.id, consentId: previous.id },
        },
        tx,
      );
    }
    await recordAudit(
      {
        ...base,
        type: "CONSENT_GRANTED",
        metadata: {
          relationshipId: rel.id,
          consentId: consent.id,
          versionNo: version.versionNo,
          itemCount: selected.length,
        },
      },
      tx,
    );
    return { consentId: consent.id };
  });
}

/** 共有の許可を取り消す（FR-020） */
export async function revokeConsent(actor: SessionUser, consentId: string) {
  const consent = await db.sharingConsent.findUnique({
    where: { id: consentId },
    include: { relationship: true },
  });
  if (!consent) throw new NotFoundError();
  const rel = consent.relationship;
  authorize(actor, "consent.manage", {
    type: "relationship",
    axisId: rel.axisId,
    agencyId: rel.agencyId,
    assignedCaId: rel.assignedCaId,
  });
  if (consent.revokedAt || consent.supersededAt) return { consentId };

  await db.$transaction(async (tx) => {
    await tx.sharingConsent.update({ where: { id: consentId }, data: { revokedAt: new Date() } });
    await recordAudit(
      {
        type: "CONSENT_REVOKED",
        actorUserId: actor.userId,
        axisId: rel.axisId,
        agencyId: rel.agencyId,
        metadata: { relationshipId: rel.id, consentId },
      },
      tx,
    );
  });
  return { consentId };
}

/** 共有の管理画面用：関係ごとの有効な許可と、本人の操作履歴（FR-022） */
export async function getSharingOverview(actor: SessionUser) {
  if (!actor.axisId) throw new NotFoundError();
  authorize(actor, "axis.readWrite", { type: "axis", axisId: actor.axisId });

  const relationships = await db.agencyRelationship.findMany({
    where: { axisId: actor.axisId },
    orderBy: { createdAt: "desc" },
    include: {
      agency: { select: { name: true } },
      consents: {
        where: { revokedAt: null, supersededAt: null },
        include: {
          snapshot: { include: { items: { orderBy: { order: "asc" } } } },
          reflectionVersion: { select: { versionNo: true } },
        },
      },
    },
  });
  const events = await db.auditEvent.findMany({
    where: {
      axisId: actor.axisId,
      type: {
        in: [
          "INVITATION_ACCEPTED",
          "CONSENT_GRANTED",
          "CONSENT_REVOKED",
          "CONSENT_SUPERSEDED",
          "SNAPSHOT_VIEWED",
          "SNAPSHOT_EXPORTED",
          "RELATIONSHIP_ENDED",
        ],
      },
    },
    orderBy: { occurredAt: "desc" },
    take: 50,
    include: { agency: { select: { name: true } } },
  });
  return { relationships, events };
}
