/**
 * 共有の結合テスト（T045 / FR-017〜FR-021）
 */
import { beforeEach, describe, expect, it } from "vitest";
import { grantConsent, revokeConsent } from "@/server/domain/consent";
import { saveReflection } from "@/server/domain/reflection";
import { getSnapshotForAgency } from "@/server/domain/snapshot";
import { agencySnapshotWhere } from "@/server/policy/snapshot-access";
import { db, resetDb } from "../helpers/db";
import {
  createAgency,
  createAgencyMember,
  createPerson,
  createRelationship,
} from "../helpers/factories";

async function setup() {
  const agency = await createAgency();
  const admin = await createAgencyMember(agency.id, "ADMIN");
  const ca = await createAgencyMember(agency.id, "CA");
  const person = await createPerson();
  const rel = await createRelationship({
    axisId: person.axisId,
    agencyId: agency.id,
    createdByMemberId: admin.memberId,
    assignedCaId: ca.memberId,
  });
  const milestone = await db.milestone.create({
    data: { axisId: person.axisId, kind: "CAREER_CHANGE" },
  });
  const session = await db.dialogueSession.create({
    data: { milestoneId: milestone.id, status: "COMPLETED", completedAt: new Date() },
  });
  const summary = await db.reflectionSummary.create({ data: { sessionId: session.id } });
  const version = await db.reflectionVersion.create({
    data: {
      summaryId: summary.id,
      versionNo: 1,
      createdBy: "AI",
      sections: {
        create: [
          { aspect: "FEELINGS", content: "息苦しい", isSensitive: false },
          { aspect: "MOTIVATION", content: "自分で決めたい", isSensitive: false },
          { aspect: "CRITERIA", content: "裁量とチーム", isSensitive: false },
          { aspect: "OPEN_QUESTIONS", content: "業界が分からない", isSensitive: true },
        ],
      },
    },
    include: { sections: true },
  });
  await db.reflectionSummary.update({
    where: { id: summary.id },
    data: { currentVersionId: version.id },
  });
  const sectionId = (aspect: string) =>
    version.sections.find((s) => s.aspect === aspect)?.id as string;
  return { person, ca, rel, summary, version, sectionId };
}

const snapshotItemsSeenByCa = async (ca: Awaited<ReturnType<typeof createAgencyMember>>) => {
  const snapshot = await db.sharedSnapshot.findFirst({
    where: agencySnapshotWhere(ca.actor),
    include: { items: { orderBy: { order: "asc" } } },
  });
  return snapshot?.items.map((i) => i.content) ?? null;
};

describe("共有の許可", () => {
  beforeEach(resetDb);

  it("0件では許可できない", async () => {
    const s = await setup();
    await expect(
      grantConsent(s.person.actor, {
        relationshipId: s.rel.id,
        versionId: s.version.id,
        itemIds: [],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("選んだ項目だけがスナップショットに入り、CA に見える", async () => {
    const s = await setup();
    await grantConsent(s.person.actor, {
      relationshipId: s.rel.id,
      versionId: s.version.id,
      itemIds: [s.sectionId("CRITERIA")],
    });
    expect(await snapshotItemsSeenByCa(s.ca)).toEqual(["裁量とチーム"]);
  });

  it("整理結果を修正しても、再許可するまでは前回許可した版が見える", async () => {
    const s = await setup();
    await grantConsent(s.person.actor, {
      relationshipId: s.rel.id,
      versionId: s.version.id,
      itemIds: [s.sectionId("CRITERIA")],
    });
    await saveReflection(s.person.actor, {
      summaryId: s.summary.id,
      baseVersionId: s.version.id,
      sections: [
        { aspect: "FEELINGS", content: "息苦しい", isSensitive: false },
        { aspect: "MOTIVATION", content: "自分で決めたい", isSensitive: false },
        { aspect: "CRITERIA", content: "裁量・チーム・成長", isSensitive: false },
        { aspect: "OPEN_QUESTIONS", content: "業界が分からない", isSensitive: true },
      ],
    });
    expect(await snapshotItemsSeenByCa(s.ca)).toEqual(["裁量とチーム"]);
  });

  it("古い版を見ていた確認画面からの許可は CONFLICT", async () => {
    const s = await setup();
    await saveReflection(s.person.actor, {
      summaryId: s.summary.id,
      baseVersionId: s.version.id,
      sections: s.version.sections.map((x) => ({
        aspect: x.aspect,
        content: x.content,
        isSensitive: x.isSensitive,
      })),
    });
    await expect(
      grantConsent(s.person.actor, {
        relationshipId: s.rel.id,
        versionId: s.version.id,
        itemIds: [s.sectionId("CRITERIA")],
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("再許可すると前の許可は置き換わり（supersededAt / supersedesId）、新しい内容だけが見える", async () => {
    const s = await setup();
    const first = await grantConsent(s.person.actor, {
      relationshipId: s.rel.id,
      versionId: s.version.id,
      itemIds: [s.sectionId("CRITERIA")],
    });
    const second = await grantConsent(s.person.actor, {
      relationshipId: s.rel.id,
      versionId: s.version.id,
      itemIds: [s.sectionId("CRITERIA"), s.sectionId("OPEN_QUESTIONS")],
    });
    const old = await db.sharingConsent.findUniqueOrThrow({ where: { id: first.consentId } });
    const latest = await db.sharingConsent.findUniqueOrThrow({ where: { id: second.consentId } });
    expect(old.supersededAt).not.toBeNull();
    expect(latest.supersedesId).toBe(first.consentId);
    expect(await snapshotItemsSeenByCa(s.ca)).toEqual(["裁量とチーム", "業界が分からない"]);
  });

  it("取り消すと CA は読めず、操作履歴に残る", async () => {
    const s = await setup();
    const { consentId } = await grantConsent(s.person.actor, {
      relationshipId: s.rel.id,
      versionId: s.version.id,
      itemIds: [s.sectionId("CRITERIA")],
    });
    await revokeConsent(s.person.actor, consentId);
    expect(await snapshotItemsSeenByCa(s.ca)).toBeNull();
    const events = await db.auditEvent.findMany({
      where: { axisId: s.person.axisId },
      select: { type: true },
    });
    expect(events.map((e) => e.type)).toEqual(
      expect.arrayContaining(["CONSENT_GRANTED", "CONSENT_REVOKED"]),
    );
  });

  it("CA は本人の代わりに許可できない", async () => {
    const s = await setup();
    await expect(
      grantConsent(s.ca.actor, {
        relationshipId: s.rel.id,
        versionId: s.version.id,
        itemIds: [s.sectionId("CRITERIA")],
      }),
    ).rejects.toThrow();
  });

  it("CA の閲覧は操作履歴に SNAPSHOT_VIEWED として残る", async () => {
    const s = await setup();
    await grantConsent(s.person.actor, {
      relationshipId: s.rel.id,
      versionId: s.version.id,
      itemIds: [s.sectionId("CRITERIA")],
    });
    const { snapshot } = await getSnapshotForAgency(s.ca.actor, s.rel.id);
    expect(snapshot?.items).toHaveLength(1);
    expect(await db.auditEvent.count({ where: { type: "SNAPSHOT_VIEWED" } })).toBe(1);
  });
});
