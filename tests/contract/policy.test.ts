/**
 * アクセス権の表（contracts/routes.md）の全セルを確認する契約テスト（T031）。
 * 表を変えるときは、contracts/routes.md・src/server/policy/index.ts・このテストを一緒に変える。
 */
import { beforeEach, describe, expect, it } from "vitest";
import { type Action, type Actor, can, type Resource } from "@/server/policy";
import { agencySnapshotWhere } from "@/server/policy/snapshot-access";
import { db, resetDb } from "../helpers/db";
import {
  createAgency,
  createAgencyMember,
  createConsentWithSnapshot,
  createOperator,
  createPerson,
  createRelationship,
} from "../helpers/factories";

// ---- 表の定義（contracts/routes.md と同じ並び） ----

type ActorKey = "P" | "CA_ASSIGNED" | "CA_OTHER" | "AD" | "OP";
const ACTOR_KEYS: ActorKey[] = ["P", "CA_ASSIGNED", "CA_OTHER", "AD", "OP"];

const TABLE: Record<Action, Record<ActorKey, boolean>> = {
  "axis.readWrite": { P: true, CA_ASSIGNED: false, CA_OTHER: false, AD: false, OP: false },
  "consent.manage": { P: true, CA_ASSIGNED: false, CA_OTHER: false, AD: false, OP: false },
  "snapshot.read": { P: true, CA_ASSIGNED: true, CA_OTHER: false, AD: true, OP: false },
  "seekerStatus.read": { P: true, CA_ASSIGNED: true, CA_OTHER: false, AD: true, OP: false },
  "metrics.read": { P: false, CA_ASSIGNED: false, CA_OTHER: false, AD: true, OP: true },
  "relationship.end": { P: true, CA_ASSIGNED: false, CA_OTHER: false, AD: true, OP: false },
};

// ---- 判定用の利用者とリソース（DB を使わない純粋な判定） ----

const AGENCY = "00000000-0000-7000-8000-00000000a001";
const OTHER_AGENCY = "00000000-0000-7000-8000-00000000a002";
const AXIS = "00000000-0000-7000-8000-00000000b001";
const OTHER_AXIS = "00000000-0000-7000-8000-00000000b002";
const CA_ASSIGNED_MEMBER = "00000000-0000-7000-8000-00000000c001";
const CA_OTHER_MEMBER = "00000000-0000-7000-8000-00000000c002";
const ADMIN_MEMBER = "00000000-0000-7000-8000-00000000c003";

const staff = (memberships: Actor["memberships"], isOperator = false): Actor => ({
  userId: crypto.randomUUID(),
  kind: "STAFF",
  isOperator,
  axisId: null,
  memberships,
});

const ACTORS: Record<ActorKey, Actor> = {
  P: { userId: crypto.randomUUID(), kind: "PERSON", isOperator: false, axisId: AXIS, memberships: [] },
  CA_ASSIGNED: staff([{ memberId: CA_ASSIGNED_MEMBER, agencyId: AGENCY, role: "CA" }]),
  CA_OTHER: staff([{ memberId: CA_OTHER_MEMBER, agencyId: AGENCY, role: "CA" }]),
  AD: staff([{ memberId: ADMIN_MEMBER, agencyId: AGENCY, role: "ADMIN" }]),
  OP: staff([], true),
};

const relationship: Resource = {
  type: "relationship",
  axisId: AXIS,
  agencyId: AGENCY,
  assignedCaId: CA_ASSIGNED_MEMBER,
};

const RESOURCE_FOR: Record<Action, Resource> = {
  "axis.readWrite": { type: "axis", axisId: AXIS },
  "consent.manage": relationship,
  "snapshot.read": relationship,
  "seekerStatus.read": relationship,
  "metrics.read": { type: "agency", agencyId: AGENCY },
  "relationship.end": relationship,
};

describe("アクセス権の表（全セル）", () => {
  for (const [action, row] of Object.entries(TABLE) as [Action, Record<ActorKey, boolean>][]) {
    for (const key of ACTOR_KEYS) {
      const expected = row[key];
      it(`${action} × ${key} → ${expected ? "許可" : "拒否"}`, () => {
        expect(can(ACTORS[key], action, RESOURCE_FOR[action])).toBe(expected);
      });
    }
  }
});

describe("所有者・所属の境界", () => {
  it("未ログインはすべて拒否", () => {
    for (const action of Object.keys(TABLE) as Action[]) {
      expect(can(null, action, RESOURCE_FOR[action])).toBe(false);
    }
  });

  it("本人は他の本人の Axis・関係を操作できない", () => {
    const other: Resource = { ...relationship, axisId: OTHER_AXIS } as Resource;
    expect(can(ACTORS.P, "axis.readWrite", { type: "axis", axisId: OTHER_AXIS })).toBe(false);
    expect(can(ACTORS.P, "consent.manage", other)).toBe(false);
    expect(can(ACTORS.P, "snapshot.read", other)).toBe(false);
  });

  it("管理者は他社の関係・集計に触れない", () => {
    const otherAgency: Resource = { ...relationship, agencyId: OTHER_AGENCY } as Resource;
    expect(can(ACTORS.AD, "snapshot.read", otherAgency)).toBe(false);
    expect(can(ACTORS.AD, "relationship.end", otherAgency)).toBe(false);
    expect(can(ACTORS.AD, "metrics.read", { type: "agency", agencyId: OTHER_AGENCY })).toBe(false);
    expect(can(ACTORS.AD, "metrics.read", { type: "all" })).toBe(false);
  });

  it("担当CAでも、他社の同じ member ID 以外の関係は読めない", () => {
    const otherAgency: Resource = { ...relationship, agencyId: OTHER_AGENCY } as Resource;
    expect(can(ACTORS.CA_ASSIGNED, "snapshot.read", otherAgency)).toBe(false);
  });

  it("担当CAが未設定の関係は、CA には見えず管理者には見える", () => {
    const unassigned: Resource = { ...relationship, assignedCaId: null } as Resource;
    expect(can(ACTORS.CA_ASSIGNED, "snapshot.read", unassigned)).toBe(false);
    expect(can(ACTORS.AD, "snapshot.read", unassigned)).toBe(true);
  });

  it("運営は全社の集計を見られるが、本人の内容は見られない", () => {
    expect(can(ACTORS.OP, "metrics.read", { type: "all" })).toBe(true);
    expect(can(ACTORS.OP, "axis.readWrite", { type: "axis", axisId: AXIS })).toBe(false);
    expect(can(ACTORS.OP, "snapshot.read", relationship)).toBe(false);
  });
});

// ---- 共有スナップショットの読み取り条件（DB を使う） ----

describe("紹介会社側がスナップショットを読める条件（snapshot-access）", () => {
  beforeEach(resetDb);

  async function setup(opts: {
    status?: "INVITED" | "ACTIVE" | "ENDED";
    revoked?: boolean;
    superseded?: boolean;
    personDeleted?: boolean;
  } = {}) {
    const agency = await createAgency();
    const otherAgency = await createAgency("別の紹介会社");
    const admin = await createAgencyMember(agency.id, "ADMIN");
    const ca = await createAgencyMember(agency.id, "CA");
    const otherCa = await createAgencyMember(agency.id, "CA");
    const otherAdmin = await createAgencyMember(otherAgency.id, "ADMIN");
    const person = await createPerson();
    const rel = await createRelationship({
      axisId: person.axisId,
      agencyId: agency.id,
      createdByMemberId: admin.memberId,
      assignedCaId: ca.memberId,
      status: opts.status,
    });
    await createConsentWithSnapshot({
      relationshipId: rel.id,
      axisId: person.axisId,
      revoked: opts.revoked,
      superseded: opts.superseded,
    });
    if (opts.personDeleted) {
      await db.user.update({ where: { id: person.user.id }, data: { deletedAt: new Date() } });
    }
    const count = (actor: Actor) => db.sharedSnapshot.count({ where: agencySnapshotWhere(actor) });
    return { admin, ca, otherCa, otherAdmin, person, count };
  }

  it("有効な許可・ACTIVE の関係なら、担当CA と管理者だけが読める", async () => {
    const s = await setup();
    expect(await s.count(s.ca.actor)).toBe(1);
    expect(await s.count(s.admin.actor)).toBe(1);
    expect(await s.count(s.otherCa.actor)).toBe(0);
    expect(await s.count(s.otherAdmin.actor)).toBe(0);
    expect(await s.count(s.person.actor)).toBe(0);
  });

  it("許可が取り消されていたら読めない", async () => {
    const s = await setup({ revoked: true });
    expect(await s.count(s.ca.actor)).toBe(0);
    expect(await s.count(s.admin.actor)).toBe(0);
  });

  it("許可が修正版に置き換えられていたら、古い版は読めない", async () => {
    const s = await setup({ superseded: true });
    expect(await s.count(s.ca.actor)).toBe(0);
  });

  it("関係が終了していたら読めない", async () => {
    const s = await setup({ status: "ENDED" });
    expect(await s.count(s.ca.actor)).toBe(0);
    expect(await s.count(s.admin.actor)).toBe(0);
  });

  it("本人が退会していたら読めない", async () => {
    const s = await setup({ personDeleted: true });
    expect(await s.count(s.ca.actor)).toBe(0);
  });

  it("1つの関係に有効な許可は2つ作れない（DB の部分一意インデックス）", async () => {
    const agency = await createAgency();
    const admin = await createAgencyMember(agency.id, "ADMIN");
    const person = await createPerson();
    const rel = await createRelationship({
      axisId: person.axisId,
      agencyId: agency.id,
      createdByMemberId: admin.memberId,
      assignedCaId: null,
    });
    await createConsentWithSnapshot({ relationshipId: rel.id, axisId: person.axisId });
    await expect(
      createConsentWithSnapshot({ relationshipId: rel.id, axisId: person.axisId }),
    ).rejects.toThrow();
  });
});
