import "server-only";
import type { ReflectionAspect } from "@/generated/prisma/enums";
import { ASPECT_ORDER } from "@/lib/labels";
import { DomainError } from "@/lib/result";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { authorize, NotFoundError } from "@/server/policy";
import { getOwnedMilestone } from "./milestone";

/** 節目の最新の整理結果（現在の版と、その項目） */
export async function getLatestReflection(actor: SessionUser, milestoneId: string) {
  await getOwnedMilestone(actor, milestoneId);
  const summary = await db.reflectionSummary.findFirst({
    where: { session: { milestoneId } },
    orderBy: { session: { completedAt: "desc" } },
    include: {
      currentVersion: { include: { sections: true } },
    },
  });
  if (!summary?.currentVersion) return null;
  const sections = [...summary.currentVersion.sections].sort(
    (a, b) => ASPECT_ORDER.indexOf(a.aspect) - ASPECT_ORDER.indexOf(b.aspect),
  );
  return { summaryId: summary.id, version: { ...summary.currentVersion, sections } };
}

/**
 * 整理結果の修正（T047 / FR-016）。新しい版を作り、古い版も残す。
 * 画面で見ていた版（baseVersionId）が最新でなければ CONFLICT。
 */
export async function saveReflection(
  actor: SessionUser,
  input: {
    summaryId: string;
    baseVersionId: string;
    sections: { aspect: ReflectionAspect; content: string; isSensitive: boolean }[];
  },
) {
  const summary = await db.reflectionSummary.findUnique({
    where: { id: input.summaryId },
    include: {
      session: { select: { milestone: { select: { axisId: true } } } },
      currentVersion: { select: { id: true, versionNo: true } },
    },
  });
  if (!summary) throw new NotFoundError();
  authorize(actor, "axis.readWrite", { type: "axis", axisId: summary.session.milestone.axisId });

  if (summary.currentVersion?.id !== input.baseVersionId) {
    throw new DomainError("CONFLICT", "別の画面で更新されています。画面を読み込み直してください");
  }

  return db.$transaction(async (tx) => {
    const version = await tx.reflectionVersion.create({
      data: {
        summaryId: summary.id,
        versionNo: (summary.currentVersion?.versionNo ?? 0) + 1,
        createdBy: "PERSON",
        sections: { create: input.sections },
      },
    });
    await tx.reflectionSummary.update({
      where: { id: summary.id },
      data: { currentVersionId: version.id },
    });
    return { versionId: version.id, versionNo: version.versionNo };
  });
}
