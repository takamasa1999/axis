-- CreateEnum
CREATE TYPE "UserKind" AS ENUM ('PERSON', 'STAFF');

-- CreateEnum
CREATE TYPE "MilestoneKind" AS ENUM ('JOB_SEARCH', 'CAREER_CHANGE', 'PROMOTION_TRANSFER', 'RESKILLING', 'LIFE_EVENT');

-- CreateEnum
CREATE TYPE "DialogueSessionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'SAFETY_STOPPED');

-- CreateEnum
CREATE TYPE "DialogueModality" AS ENUM ('TEXT', 'VOICE');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('PERSON', 'AXIS');

-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('ANSWER', 'QUESTION', 'MATERIAL', 'SAFETY', 'INTRO');

-- CreateEnum
CREATE TYPE "ReflectionAuthor" AS ENUM ('AI', 'PERSON');

-- CreateEnum
CREATE TYPE "ReflectionAspect" AS ENUM ('FEELINGS', 'MOTIVATION', 'CRITERIA', 'OPEN_QUESTIONS');

-- CreateEnum
CREATE TYPE "RecordEntryType" AS ENUM ('VALUES', 'CONCERNS', 'CRITERIA_VISION', 'OPTIONS_COMPARED', 'REASON');

-- CreateEnum
CREATE TYPE "RecordSource" AS ENUM ('DIALOGUE', 'PERSON');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('APPLY', 'DECLINE', 'ACCEPT_OFFER', 'STAY', 'OTHER');

-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('INVITED', 'ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "RelationshipEndedBy" AS ENUM ('PERSON', 'AGENCY');

-- CreateEnum
CREATE TYPE "SnapshotSourceKind" AS ENUM ('REFLECTION_SECTION', 'RECORD_ENTRY', 'DECISION');

-- CreateEnum
CREATE TYPE "AgencyStatus" AS ENUM ('PILOT', 'PAID_PILOT', 'CONTRACTED', 'ENDED');

-- CreateEnum
CREATE TYPE "AgencyRole" AS ENUM ('CA', 'ADMIN');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('INVITATION_SENT', 'INVITATION_ACCEPTED', 'SESSION_STARTED', 'SESSION_COMPLETED', 'SESSION_SAFETY_STOPPED', 'CONSENT_GRANTED', 'CONSENT_REVOKED', 'CONSENT_SUPERSEDED', 'SNAPSHOT_VIEWED', 'SNAPSHOT_EXPORTED', 'RELATIONSHIP_ENDED', 'AXIS_EXPORTED', 'AXIS_DELETED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "twoFactorEnabled" BOOLEAN DEFAULT false,
    "kind" "UserKind" NOT NULL DEFAULT 'PERSON',
    "isOperator" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(3),
    "refreshTokenExpiresAt" TIMESTAMPTZ(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "two_factors" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "verified" BOOLEAN DEFAULT true,
    "failedVerificationCount" INTEGER DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ(3),

    CONSTRAINT "two_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_axes" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_axes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" UUID NOT NULL,
    "axisId" UUID NOT NULL,
    "kind" "MilestoneKind" NOT NULL,
    "title" TEXT,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dialogue_sessions" (
    "id" UUID NOT NULL,
    "milestoneId" UUID NOT NULL,
    "status" "DialogueSessionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "modality" "DialogueModality" NOT NULL DEFAULT 'TEXT',
    "startedAt" TIMESTAMPTZ(3),
    "lastActiveAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "safetyStoppedAt" TIMESTAMPTZ(3),

    CONSTRAINT "dialogue_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dialogue_messages" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "role" "MessageRole" NOT NULL,
    "kind" "MessageKind" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dialogue_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reflection_summaries" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "currentVersionId" UUID,

    CONSTRAINT "reflection_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reflection_versions" (
    "id" UUID NOT NULL,
    "summaryId" UUID NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "createdBy" "ReflectionAuthor" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reflection_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reflection_sections" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "aspect" "ReflectionAspect" NOT NULL,
    "content" TEXT NOT NULL,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "reflection_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_entries" (
    "id" UUID NOT NULL,
    "milestoneId" UUID NOT NULL,
    "type" "RecordEntryType" NOT NULL,
    "content" TEXT NOT NULL,
    "source" "RecordSource" NOT NULL,
    "sourceSessionId" UUID,
    "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_records" (
    "id" UUID NOT NULL,
    "milestoneId" UUID NOT NULL,
    "decision" "Decision" NOT NULL,
    "reason" TEXT NOT NULL,
    "decidedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" TEXT,

    CONSTRAINT "decision_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_options" (
    "id" UUID NOT NULL,
    "decisionId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "notesByCriteria" JSONB NOT NULL DEFAULT '{}',
    "chosen" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "decision_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_relationships" (
    "id" UUID NOT NULL,
    "axisId" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "assignedCaId" UUID,
    "invitationId" UUID NOT NULL,
    "status" "RelationshipStatus" NOT NULL DEFAULT 'INVITED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMPTZ(3),
    "endedBy" "RelationshipEndedBy",

    CONSTRAINT "agency_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sharing_consents" (
    "id" UUID NOT NULL,
    "relationshipId" UUID NOT NULL,
    "reflectionVersionId" UUID NOT NULL,
    "grantedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(3),
    "supersededAt" TIMESTAMPTZ(3),
    "supersedesId" UUID,

    CONSTRAINT "sharing_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_snapshots" (
    "id" UUID NOT NULL,
    "consentId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_snapshot_items" (
    "id" UUID NOT NULL,
    "snapshotId" UUID NOT NULL,
    "sourceKind" "SnapshotSourceKind" NOT NULL,
    "label" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "shared_snapshot_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agencies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AgencyStatus" NOT NULL DEFAULT 'PILOT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_members" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "AgencyRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "agency_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "createdByMemberId" UUID NOT NULL,
    "assignedCaId" UUID,
    "email" TEXT,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3),

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" UUID,
    "axisId" UUID,
    "agencyId" UUID,
    "type" "AuditEventType" NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE INDEX "verifications_identifier_idx" ON "verifications"("identifier");

-- CreateIndex
CREATE INDEX "two_factors_secret_idx" ON "two_factors"("secret");

-- CreateIndex
CREATE INDEX "two_factors_userId_idx" ON "two_factors"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "personal_axes_userId_key" ON "personal_axes"("userId");

-- CreateIndex
CREATE INDEX "milestones_axisId_startedAt_idx" ON "milestones"("axisId", "startedAt");

-- CreateIndex
CREATE INDEX "dialogue_sessions_milestoneId_idx" ON "dialogue_sessions"("milestoneId");

-- CreateIndex
CREATE INDEX "dialogue_messages_sessionId_createdAt_idx" ON "dialogue_messages"("sessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "reflection_summaries_sessionId_key" ON "reflection_summaries"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "reflection_summaries_currentVersionId_key" ON "reflection_summaries"("currentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "reflection_versions_summaryId_versionNo_key" ON "reflection_versions"("summaryId", "versionNo");

-- CreateIndex
CREATE UNIQUE INDEX "reflection_sections_versionId_aspect_key" ON "reflection_sections"("versionId", "aspect");

-- CreateIndex
CREATE INDEX "record_entries_milestoneId_recordedAt_idx" ON "record_entries"("milestoneId", "recordedAt");

-- CreateIndex
CREATE INDEX "decision_records_milestoneId_decidedAt_idx" ON "decision_records"("milestoneId", "decidedAt");

-- CreateIndex
CREATE UNIQUE INDEX "agency_relationships_invitationId_key" ON "agency_relationships"("invitationId");

-- CreateIndex
CREATE INDEX "agency_relationships_agencyId_status_idx" ON "agency_relationships"("agencyId", "status");

-- CreateIndex
CREATE INDEX "agency_relationships_assignedCaId_idx" ON "agency_relationships"("assignedCaId");

-- CreateIndex
CREATE UNIQUE INDEX "agency_relationships_axisId_agencyId_key" ON "agency_relationships"("axisId", "agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "sharing_consents_supersedesId_key" ON "sharing_consents"("supersedesId");

-- CreateIndex
CREATE INDEX "sharing_consents_relationshipId_idx" ON "sharing_consents"("relationshipId");

-- CreateIndex
CREATE UNIQUE INDEX "shared_snapshots_consentId_key" ON "shared_snapshots"("consentId");

-- CreateIndex
CREATE INDEX "shared_snapshot_items_snapshotId_order_idx" ON "shared_snapshot_items"("snapshotId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "agency_members_agencyId_userId_key" ON "agency_members"("agencyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_tokenHash_key" ON "invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "invitations_agencyId_createdAt_idx" ON "invitations"("agencyId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_events_axisId_occurredAt_idx" ON "audit_events"("axisId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_events_agencyId_type_occurredAt_idx" ON "audit_events"("agencyId", "type", "occurredAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "two_factors" ADD CONSTRAINT "two_factors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_axes" ADD CONSTRAINT "personal_axes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_axisId_fkey" FOREIGN KEY ("axisId") REFERENCES "personal_axes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dialogue_sessions" ADD CONSTRAINT "dialogue_sessions_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dialogue_messages" ADD CONSTRAINT "dialogue_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "dialogue_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reflection_summaries" ADD CONSTRAINT "reflection_summaries_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "dialogue_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reflection_summaries" ADD CONSTRAINT "reflection_summaries_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "reflection_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reflection_versions" ADD CONSTRAINT "reflection_versions_summaryId_fkey" FOREIGN KEY ("summaryId") REFERENCES "reflection_summaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reflection_sections" ADD CONSTRAINT "reflection_sections_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "reflection_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_entries" ADD CONSTRAINT "record_entries_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_entries" ADD CONSTRAINT "record_entries_sourceSessionId_fkey" FOREIGN KEY ("sourceSessionId") REFERENCES "dialogue_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_records" ADD CONSTRAINT "decision_records_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_options" ADD CONSTRAINT "decision_options_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decision_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_relationships" ADD CONSTRAINT "agency_relationships_axisId_fkey" FOREIGN KEY ("axisId") REFERENCES "personal_axes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_relationships" ADD CONSTRAINT "agency_relationships_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_relationships" ADD CONSTRAINT "agency_relationships_assignedCaId_fkey" FOREIGN KEY ("assignedCaId") REFERENCES "agency_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_relationships" ADD CONSTRAINT "agency_relationships_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sharing_consents" ADD CONSTRAINT "sharing_consents_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "agency_relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sharing_consents" ADD CONSTRAINT "sharing_consents_reflectionVersionId_fkey" FOREIGN KEY ("reflectionVersionId") REFERENCES "reflection_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sharing_consents" ADD CONSTRAINT "sharing_consents_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "sharing_consents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_snapshots" ADD CONSTRAINT "shared_snapshots_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "sharing_consents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_snapshot_items" ADD CONSTRAINT "shared_snapshot_items_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "shared_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_members" ADD CONSTRAINT "agency_members_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_members" ADD CONSTRAINT "agency_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_createdByMemberId_fkey" FOREIGN KEY ("createdByMemberId") REFERENCES "agency_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_assignedCaId_fkey" FOREIGN KEY ("assignedCaId") REFERENCES "agency_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_axisId_fkey" FOREIGN KEY ("axisId") REFERENCES "personal_axes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
