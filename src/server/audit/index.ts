import "server-only";
import type { AuditEventType } from "@/generated/prisma/enums";
import { db, type Tx } from "@/server/db";

/**
 * 操作履歴に入れてよい値（T021）。本文を入れないよう、ID・件数・版番号・状態だけに型で制限する。
 */
export type AuditMetadata = {
  relationshipId?: string;
  consentId?: string;
  snapshotId?: string;
  sessionId?: string;
  milestoneId?: string;
  invitationId?: string;
  versionNo?: number;
  itemCount?: number;
  durationSeconds?: number;
  endedBy?: "PERSON" | "AGENCY";
};

export type AuditInput = {
  type: AuditEventType;
  actorUserId?: string | null;
  axisId?: string | null;
  agencyId?: string | null;
  metadata?: AuditMetadata;
};

/** 操作履歴を追記する。共有・許可に関わる処理では、同じトランザクション（tx）を渡す */
export async function recordAudit(input: AuditInput, tx: Tx | typeof db = db) {
  await tx.auditEvent.create({
    data: {
      type: input.type,
      actorUserId: input.actorUserId ?? null,
      axisId: input.axisId ?? null,
      agencyId: input.agencyId ?? null,
      metadata: input.metadata ?? {},
    },
  });
}
