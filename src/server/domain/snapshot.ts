import "server-only";
import { recordAudit } from "@/server/audit";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { authorize, NotFoundError } from "@/server/policy";
import { agencySnapshotWhere } from "@/server/policy/snapshot-access";
import { listSeekers } from "./agency-seekers";

/**
 * 紹介会社側が、許可済みの要約を読む（T056 / FR-024, FR-025）。
 * 読めるのは共有スナップショットだけ。本人の対話・整理結果そのものには触れない。
 */
export async function getSnapshotForAgency(
  actor: SessionUser,
  relationshipId: string,
  purpose: "view" | "export" = "view",
) {
  const rel = await db.agencyRelationship.findUnique({
    where: { id: relationshipId },
    select: { id: true, axisId: true, agencyId: true, assignedCaId: true },
  });
  if (!rel) throw new NotFoundError();
  authorize(actor, "seekerStatus.read", {
    type: "relationship",
    axisId: rel.axisId,
    agencyId: rel.agencyId,
    assignedCaId: rel.assignedCaId,
  });

  const seeker = (await listSeekers(actor)).find((s) => s.relationshipId === rel.id);
  if (!seeker) throw new NotFoundError();

  const snapshot = await db.sharedSnapshot.findFirst({
    where: { AND: [agencySnapshotWhere(actor), { consent: { relationshipId: rel.id } }] },
    include: {
      items: { orderBy: { order: "asc" } },
      consent: { select: { grantedAt: true, reflectionVersion: { select: { versionNo: true } } } },
    },
  });

  if (snapshot) {
    await recordAudit({
      type: purpose === "export" ? "SNAPSHOT_EXPORTED" : "SNAPSHOT_VIEWED",
      actorUserId: actor.userId,
      axisId: rel.axisId,
      agencyId: rel.agencyId,
      metadata: { relationshipId: rel.id, snapshotId: snapshot.id },
    });
  }
  return { seeker, snapshot };
}

/** 許可済み要約を CSV にする（T061）。Excel で文字化けしないよう BOM を付ける */
export function snapshotToCsv(
  relationshipId: string,
  agencyName: string,
  snapshot: NonNullable<Awaited<ReturnType<typeof getSnapshotForAgency>>["snapshot"]>,
): string {
  const header = [
    "relationship_id",
    "agency_name",
    "consented_at",
    "version_no",
    "item_label",
    "item_content",
  ];
  const rows = snapshot.items.map((item) => [
    relationshipId,
    agencyName,
    snapshot.consent.grantedAt.toISOString(),
    String(snapshot.consent.reflectionVersion.versionNo),
    item.label,
    item.content,
  ]);
  const quote = (v: string) => `"${v.replaceAll('"', '""')}"`;
  return `﻿${[header, ...rows].map((r) => r.map(quote).join(",")).join("\r\n")}\r\n`;
}
