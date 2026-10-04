/**
 * 掲示板のアクセス権の表（specs/002-job-board/contracts/routes.md）の全セルを確認する契約テスト（T017）。
 * 表を変えるときは、routes.md・src/server/policy/board.ts・このテストを一緒に変える。
 */
import { describe, expect, it } from "vitest";
import {
  type BoardAction,
  type BoardActor,
  type BoardResource,
  canBoard,
} from "@/server/policy/board";

type Who = "ANON" | "S_SELF" | "S_OTHER" | "E_SELF" | "E_OTHER" | "OP";
const WHO: Who[] = ["ANON", "S_SELF", "S_OTHER", "E_SELF", "E_OTHER", "OP"];

const SEEKER = "seeker-self";
const EMPLOYER = "employer-self";

const actor = (userId: string, kind: BoardActor["kind"], isOperator = false): BoardActor => ({
  userId,
  kind,
  isOperator,
  suspended: false,
});

const ACTORS: Record<Who, BoardActor | null> = {
  ANON: null,
  S_SELF: actor(SEEKER, "PERSON"),
  S_OTHER: actor("seeker-other", "PERSON"),
  E_SELF: actor(EMPLOYER, "EMPLOYER"),
  E_OTHER: actor("employer-other", "EMPLOYER"),
  OP: actor("operator", "STAFF", true),
};

/** 各操作の対象（S_SELF と E_SELF が当事者） */
const RESOURCE: Record<BoardAction, BoardResource> = {
  "job.view": { type: "job", employerId: EMPLOYER },
  "job.manage": { type: "job", employerId: EMPLOYER },
  "job.moderate": { type: "job", employerId: EMPLOYER },
  "application.create": { type: "none" },
  "application.view": { type: "application", seekerId: SEEKER, employerId: EMPLOYER },
  "seekerPost.manage": { type: "seekerPost", seekerId: SEEKER, published: true },
  "seekerPost.view": { type: "seekerPost", seekerId: SEEKER, published: true },
  "conversation.access": { type: "conversation", seekerId: SEEKER, employerId: EMPLOYER },
  "reportEvidence.view": { type: "report", reporterId: SEEKER },
  "report.create": { type: "none" },
  "inquiry.create": { type: "none" },
  "moderation.handle": { type: "none" },
  "entitlement.grant": { type: "none" },
  "axisEngine.use": { type: "axisEngine", hasEntitlement: true },
  "metrics.view": { type: "none" },
};

/** routes.md の表と同じ並び（誰でも / S本人 / S他人 / E本人 / E他社 / OP） */
const T = true;
const F = false;
const TABLE: Record<BoardAction, [boolean, boolean, boolean, boolean, boolean, boolean]> = {
  "job.view": [T, T, T, T, T, T],
  "job.manage": [F, F, F, T, F, F],
  "job.moderate": [F, F, F, F, F, T],
  "application.create": [F, T, T, F, F, F],
  "application.view": [F, T, F, T, F, F],
  "seekerPost.manage": [F, T, F, F, F, F],
  "seekerPost.view": [F, T, F, T, T, T],
  "conversation.access": [F, T, F, T, F, F],
  "reportEvidence.view": [F, T, F, F, F, T],
  "report.create": [F, T, T, T, T, F],
  "inquiry.create": [T, T, T, T, T, T],
  "moderation.handle": [F, F, F, F, F, T],
  "entitlement.grant": [F, F, F, F, F, T],
  "axisEngine.use": [F, T, T, F, F, F],
  "metrics.view": [F, F, F, F, F, T],
};

describe("掲示板のアクセス権の表（全セル）", () => {
  for (const [action, row] of Object.entries(TABLE) as [BoardAction, boolean[]][]) {
    WHO.forEach((who, i) => {
      it(`${action} × ${who} → ${row[i] ? "許可" : "拒否"}`, () => {
        expect(canBoard(ACTORS[who], action, RESOURCE[action])).toBe(row[i]);
      });
    });
  }
});

describe("境界のケース", () => {
  it("運営は会話を読めない（通信の秘密）", () => {
    expect(canBoard(ACTORS.OP, "conversation.access", RESOURCE["conversation.access"])).toBe(false);
  });

  it("運営は求人の内容を編集できない（非公開・解除だけ）", () => {
    expect(canBoard(ACTORS.OP, "job.manage", RESOURCE["job.manage"])).toBe(false);
    expect(canBoard(ACTORS.OP, "job.moderate", RESOURCE["job.moderate"])).toBe(true);
  });

  it("非公開の求職の投稿は企業から見えない", () => {
    expect(
      canBoard(ACTORS.E_OTHER, "seekerPost.view", {
        type: "seekerPost",
        seekerId: SEEKER,
        published: false,
      }),
    ).toBe(false);
    expect(
      canBoard(ACTORS.S_SELF, "seekerPost.view", {
        type: "seekerPost",
        seekerId: SEEKER,
        published: false,
      }),
    ).toBe(true);
  });

  it("利用権がない求職者は Axis エンジンを使えない", () => {
    expect(
      canBoard(ACTORS.S_SELF, "axisEngine.use", { type: "axisEngine", hasEntitlement: false }),
    ).toBe(false);
  });

  it("停止中のアカウントは閲覧以外できない", () => {
    const suspended = { ...actor(SEEKER, "PERSON"), suspended: true };
    expect(canBoard(suspended, "job.view", RESOURCE["job.view"])).toBe(true);
    expect(canBoard(suspended, "application.create")).toBe(false);
    expect(canBoard(suspended, "conversation.access", RESOURCE["conversation.access"])).toBe(false);
    expect(canBoard(suspended, "report.create")).toBe(false);
  });

  it("001 の紹介会社の所属者（STAFF・運営でない）は掲示板の操作をできない", () => {
    const agencyStaff = actor("agency-staff", "STAFF");
    expect(canBoard(agencyStaff, "job.manage", RESOURCE["job.manage"])).toBe(false);
    expect(canBoard(agencyStaff, "moderation.handle")).toBe(false);
    expect(canBoard(agencyStaff, "conversation.access", RESOURCE["conversation.access"])).toBe(
      false,
    );
  });
});
