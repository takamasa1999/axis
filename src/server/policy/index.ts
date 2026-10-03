/**
 * アクセス権の判定（T019）。contracts/routes.md「アクセス権の表」の唯一の定義。
 *
 * - すべての読み取り・書き込みは、データに触れる前にここを通す
 * - 権限がないときは、存在を明かさないよう NOT_FOUND として扱う
 * - ここで判定するのは「誰が」。共有スナップショットの「状態」（取り消し・関係の終了など）は
 *   snapshot-access.ts のクエリ条件で判定する
 *
 * この表を変えたら tests/contract/policy.test.ts も必ず更新する。
 */
import type { SessionUser } from "@/server/auth/session";

export type Action =
  /** 対話・整理結果・記録・選択の閲覧・編集 */
  | "axis.readWrite"
  /** 共有の許可・取り消し */
  | "consent.manage"
  /** 有効な共有スナップショットの閲覧・出力 */
  | "snapshot.read"
  /** 求職者の状態（内容なし）の閲覧 */
  | "seekerStatus.read"
  /** 集計（件数） */
  | "metrics.read"
  /** 関係の終了 */
  | "relationship.end";

export type Resource =
  | { type: "axis"; axisId: string }
  | {
      type: "relationship";
      axisId: string;
      agencyId: string;
      assignedCaId: string | null;
    }
  | { type: "agency"; agencyId: string }
  | { type: "all" };

export type Actor = Pick<SessionUser, "userId" | "kind" | "isOperator" | "axisId" | "memberships">;

const isOwner = (actor: Actor, axisId: string) =>
  actor.kind === "PERSON" && actor.axisId !== null && actor.axisId === axisId;

const membershipIn = (actor: Actor, agencyId: string) =>
  actor.kind === "STAFF" ? actor.memberships.find((m) => m.agencyId === agencyId) : undefined;

const isAdminOf = (actor: Actor, agencyId: string) =>
  membershipIn(actor, agencyId)?.role === "ADMIN";

const isAssignedCaOf = (actor: Actor, agencyId: string, assignedCaId: string | null) => {
  const m = membershipIn(actor, agencyId);
  return m?.role === "CA" && assignedCaId !== null && m.memberId === assignedCaId;
};

export function can(actor: Actor | null, action: Action, resource: Resource): boolean {
  if (!actor) return false;

  switch (action) {
    case "axis.readWrite":
      return resource.type === "axis" && isOwner(actor, resource.axisId);

    case "consent.manage":
      return resource.type === "relationship" && isOwner(actor, resource.axisId);

    case "snapshot.read":
    case "seekerStatus.read":
      if (resource.type !== "relationship") return false;
      return (
        isOwner(actor, resource.axisId) ||
        isAssignedCaOf(actor, resource.agencyId, resource.assignedCaId) ||
        isAdminOf(actor, resource.agencyId)
      );

    case "metrics.read":
      if (resource.type === "agency") {
        return isAdminOf(actor, resource.agencyId) || (actor.kind === "STAFF" && actor.isOperator);
      }
      if (resource.type === "all") return actor.kind === "STAFF" && actor.isOperator;
      return false;

    case "relationship.end":
      if (resource.type !== "relationship") return false;
      return isOwner(actor, resource.axisId) || isAdminOf(actor, resource.agencyId);
  }
}

/** 権限がないときに投げる。呼び出し側では NOT_FOUND として返す */
export class NotFoundError extends Error {
  constructor() {
    super("NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export function authorize(
  actor: Actor | null,
  action: Action,
  resource: Resource,
): asserts actor is Actor {
  if (!can(actor, action, resource)) throw new NotFoundError();
}
