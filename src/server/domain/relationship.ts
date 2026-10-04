import "server-only";
import { recordAudit } from "@/server/audit";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { authorize, NotFoundError } from "@/server/policy";

/**
 * 紹介会社との関係を終了する（T068 / FR-030）。
 * 関係だけを ENDED にし、本人の Axis（記録）には触れない。共有先からの閲覧はできなくなる。
 */
export async function endRelationship(actor: SessionUser, relationshipId: string) {
  const rel = await db.agencyRelationship.findUnique({ where: { id: relationshipId } });
  if (!rel) throw new NotFoundError();
  authorize(actor, "relationship.end", {
    type: "relationship",
    axisId: rel.axisId,
    agencyId: rel.agencyId,
    assignedCaId: rel.assignedCaId,
  });
  if (rel.status === "ENDED") return { relationshipId };

  const endedBy = actor.kind === "PERSON" ? "PERSON" : "AGENCY";
  await db.$transaction(async (tx) => {
    await tx.agencyRelationship.update({
      where: { id: rel.id },
      data: { status: "ENDED", endedAt: new Date(), endedBy },
    });
    await recordAudit(
      {
        type: "RELATIONSHIP_ENDED",
        actorUserId: actor.userId,
        axisId: rel.axisId,
        agencyId: rel.agencyId,
        metadata: { relationshipId: rel.id, endedBy },
      },
      tx,
    );
  });
  return { relationshipId };
}
