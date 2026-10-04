import type { AgencyRole } from "@/generated/prisma/enums";
import { loadSessionUser, type SessionUser } from "@/server/auth/session";
import { db } from "@/server/db";

let seq = 0;
const uniqueEmail = (prefix: string) => `${prefix}-${Date.now()}-${++seq}@test.example`;

async function toSessionUser(userId: string): Promise<SessionUser> {
  const user = await loadSessionUser(userId);
  if (!user) throw new Error("factory: session user not found");
  return user;
}

/** 本人（PERSON）と本人の Axis を作る */
export async function createPerson() {
  const user = await db.user.create({
    data: { email: uniqueEmail("person"), kind: "PERSON", personalAxis: { create: {} } },
    include: { personalAxis: true },
  });
  if (!user.personalAxis) throw new Error("factory: personal axis not created");
  return { user, axisId: user.personalAxis.id, actor: await toSessionUser(user.id) };
}

export async function createAgency(name = "テスト紹介会社") {
  return db.agency.create({ data: { name } });
}

/** 紹介会社の所属者（CA / ADMIN） */
export async function createAgencyMember(agencyId: string, role: AgencyRole) {
  const user = await db.user.create({
    data: {
      email: uniqueEmail(role.toLowerCase()),
      kind: "STAFF",
      memberships: { create: { agencyId, role } },
    },
    include: { memberships: true },
  });
  return { user, memberId: user.memberships[0].id, actor: await toSessionUser(user.id) };
}

/** 運営 */
export async function createOperator() {
  const user = await db.user.create({
    data: { email: uniqueEmail("ops"), kind: "STAFF", isOperator: true },
  });
  return { user, actor: await toSessionUser(user.id) };
}

/** 利用案内を経由した、本人と紹介会社の関係 */
export async function createRelationship(params: {
  axisId: string;
  agencyId: string;
  createdByMemberId: string;
  assignedCaId: string | null;
  status?: "INVITED" | "ACTIVE" | "ENDED";
}) {
  const invitation = await db.invitation.create({
    data: {
      agencyId: params.agencyId,
      createdByMemberId: params.createdByMemberId,
      assignedCaId: params.assignedCaId,
      tokenHash: `hash-${Date.now()}-${++seq}`,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      acceptedAt: new Date(),
    },
  });
  return db.agencyRelationship.create({
    data: {
      axisId: params.axisId,
      agencyId: params.agencyId,
      assignedCaId: params.assignedCaId,
      invitationId: invitation.id,
      status: params.status ?? "ACTIVE",
    },
  });
}

/** 整理結果の版と、その版に対する共有許可・スナップショット（1項目）を作る */
export async function createConsentWithSnapshot(params: {
  relationshipId: string;
  axisId: string;
  revoked?: boolean;
  superseded?: boolean;
}) {
  const milestone = await db.milestone.create({
    data: { axisId: params.axisId, kind: "CAREER_CHANGE" },
  });
  const session = await db.dialogueSession.create({
    data: { milestoneId: milestone.id, status: "COMPLETED" },
  });
  const summary = await db.reflectionSummary.create({ data: { sessionId: session.id } });
  const version = await db.reflectionVersion.create({
    data: {
      summaryId: summary.id,
      versionNo: 1,
      createdBy: "AI",
      sections: { create: { aspect: "CRITERIA", content: "裁量を大切にしたい" } },
    },
  });
  return db.sharingConsent.create({
    data: {
      relationshipId: params.relationshipId,
      reflectionVersionId: version.id,
      revokedAt: params.revoked ? new Date() : null,
      supersededAt: params.superseded ? new Date() : null,
      snapshot: {
        create: {
          items: {
            create: {
              sourceKind: "REFLECTION_SECTION",
              label: "判断軸",
              content: "裁量を大切にしたい",
              order: 0,
            },
          },
        },
      },
    },
    include: { snapshot: true },
  });
}
