import type { Prisma } from "@/generated/prisma/client";
import type { Actor } from "./index";

/**
 * 紹介会社側（CA・管理者）が共有スナップショットを読める条件（T020 / data-model.md）。
 * 次をすべて満たすときだけ読める：
 *   1. 閲覧者が関係先の紹介会社の所属者で、担当CA または 管理者
 *   2. 関係の status = ACTIVE
 *   3. 許可が有効（revokedAt IS NULL AND supersededAt IS NULL）
 *   4. 本人のアカウントが削除されていない
 *
 * CA 側のスナップショット取得は、必ずこの条件で絞り込む。
 */
export function agencySnapshotWhere(actor: Actor): Prisma.SharedSnapshotWhereInput {
  if (actor.kind !== "STAFF" || actor.memberships.length === 0) {
    // 何にも一致しない条件
    return { id: { in: [] } };
  }

  const adminAgencyIds = actor.memberships.filter((m) => m.role === "ADMIN").map((m) => m.agencyId);
  const caMemberIds = actor.memberships.filter((m) => m.role === "CA").map((m) => m.memberId);

  return {
    consent: {
      revokedAt: null,
      supersededAt: null,
      relationship: {
        status: "ACTIVE",
        axis: { user: { deletedAt: null } },
        OR: [{ agencyId: { in: adminAgencyIds } }, { assignedCaId: { in: caMemberIds } }],
      },
    },
  };
}
