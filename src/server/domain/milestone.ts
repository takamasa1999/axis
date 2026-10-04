import "server-only";
import type { MilestoneKind } from "@/generated/prisma/enums";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { authorize, NotFoundError } from "@/server/policy";

/** 本人の節目を取得し、本人のものであることを確かめる */
export async function getOwnedMilestone(actor: SessionUser, milestoneId: string) {
  const milestone = await db.milestone.findUnique({ where: { id: milestoneId } });
  if (!milestone) throw new NotFoundError();
  authorize(actor, "axis.readWrite", { type: "axis", axisId: milestone.axisId });
  return milestone;
}

export async function listMilestones(actor: SessionUser) {
  if (!actor.axisId) throw new NotFoundError();
  authorize(actor, "axis.readWrite", { type: "axis", axisId: actor.axisId });
  return db.milestone.findMany({
    where: { axisId: actor.axisId },
    orderBy: { startedAt: "desc" },
    include: {
      sessions: {
        orderBy: { startedAt: "desc" },
        take: 1,
        select: { id: true, status: true, completedAt: true },
      },
    },
  });
}

/** 節目を作る（FR-012） */
export async function createMilestone(
  actor: SessionUser,
  input: { kind: MilestoneKind; title?: string },
) {
  if (!actor.axisId) throw new NotFoundError();
  authorize(actor, "axis.readWrite", { type: "axis", axisId: actor.axisId });
  return db.milestone.create({
    data: { axisId: actor.axisId, kind: input.kind, title: input.title || null },
  });
}
