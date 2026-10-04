/**
 * 掲示板のアクセス権（T016）。specs/002-job-board/contracts/routes.md「アクセス権の表」の唯一の定義。
 *
 * - 運営が会話・メッセージを読む操作は**定義しない**（原則VII・通信の秘密）。運営が見られるのは通報の提出物だけ
 * - 運営は求人の内容を変更できない（FR-016）。できるのは非公開・解除だけ
 * - 停止中のアカウントは閲覧以外のすべての操作ができない
 * - メール確認が必要な操作（✉）は assertCanAct（guards.ts）で別に確認する
 *
 * この表を変えたら tests/contract/board-policy.test.ts も必ず更新する。
 */
import { NotFoundError } from "./index";

export { NotFoundError };

export type BoardActor = {
  userId: string;
  kind: "PERSON" | "EMPLOYER" | "STAFF";
  isOperator: boolean;
  suspended: boolean;
};

export type BoardAction =
  | "job.view" // 公開中の求人を見る
  | "job.manage" // 求人を作る・編集・募集終了
  | "job.moderate" // 求人を非公開にする・解除
  | "application.create" // 応募する
  | "application.view" // 応募の共有内容を見る
  | "seekerPost.manage" // 求職の投稿を作る・編集
  | "seekerPost.view" // 公開中の求職の投稿を見る
  | "conversation.access" // 会話を読む・送る
  | "reportEvidence.view" // 通報の提出物を読む
  | "report.create" // 通報する
  | "inquiry.create" // お問い合わせを送る
  | "moderation.handle" // 通報・お問い合わせに対応する
  | "entitlement.grant" // 追加機能の利用権を付与する
  | "axisEngine.use" // Axis エンジンを使う
  | "metrics.view"; // 集計を見る

export type BoardResource =
  | { type: "none" }
  | { type: "job"; employerId: string }
  | { type: "application"; seekerId: string; employerId: string }
  | { type: "seekerPost"; seekerId: string; published: boolean }
  | { type: "conversation"; seekerId: string; employerId: string }
  | { type: "report"; reporterId: string }
  | { type: "axisEngine"; hasEntitlement: boolean };

const isSeeker = (a: BoardActor) => a.kind === "PERSON";
const isEmployer = (a: BoardActor) => a.kind === "EMPLOYER";
const isOperator = (a: BoardActor) => a.kind === "STAFF" && a.isOperator;

export function canBoard(
  actor: BoardActor | null,
  action: BoardAction,
  resource: BoardResource = { type: "none" },
): boolean {
  // 誰でもできること
  if (action === "job.view") return true;
  if (action === "inquiry.create") return true;
  if (!actor) return false;

  // 停止中は閲覧（job.view）以外できない。自分の通報の提出物を見ることも止める
  if (actor.suspended && !isOperator(actor)) return false;

  switch (action) {
    case "job.manage":
      return isEmployer(actor) && resource.type === "job" && resource.employerId === actor.userId;
    case "job.moderate":
      return isOperator(actor);
    case "application.create":
      return isSeeker(actor);
    case "application.view":
      return (
        resource.type === "application" &&
        ((isSeeker(actor) && resource.seekerId === actor.userId) ||
          (isEmployer(actor) && resource.employerId === actor.userId))
      );
    case "seekerPost.manage":
      return (
        isSeeker(actor) && resource.type === "seekerPost" && resource.seekerId === actor.userId
      );
    case "seekerPost.view":
      if (resource.type !== "seekerPost") return false;
      if (isSeeker(actor)) return resource.seekerId === actor.userId;
      if (isEmployer(actor)) return resource.published;
      return isOperator(actor); // 通報対応のとき
    case "conversation.access":
      // 当事者だけ。運営を含め、それ以外は読めない
      return (
        resource.type === "conversation" &&
        ((isSeeker(actor) && resource.seekerId === actor.userId) ||
          (isEmployer(actor) && resource.employerId === actor.userId))
      );
    case "reportEvidence.view":
      return (
        resource.type === "report" && (isOperator(actor) || resource.reporterId === actor.userId)
      );
    case "report.create":
      return isSeeker(actor) || isEmployer(actor);
    case "moderation.handle":
    case "entitlement.grant":
    case "metrics.view":
      return isOperator(actor);
    case "axisEngine.use":
      return isSeeker(actor) && resource.type === "axisEngine" && resource.hasEntitlement;
    default:
      return false;
  }
}

/** 権限がないときは存在を明かさず NOT_FOUND として扱う */
export function authorizeBoard(
  actor: BoardActor | null,
  action: BoardAction,
  resource?: BoardResource,
): asserts actor is BoardActor {
  if (!canBoard(actor, action, resource)) throw new NotFoundError();
}
