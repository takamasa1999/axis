-- 002 掲示板（specs/002-job-board/data-model.md）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "JobPostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'EXPIRED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'CONTRACT', 'PART_TIME', 'DISPATCH');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('INDEFINITE', 'FIXED_TERM');

-- CreateEnum
CREATE TYPE "RenewalPolicy" AS ENUM ('RENEWABLE', 'CONDITIONAL', 'NOT_RENEWABLE');

-- CreateEnum
CREATE TYPE "RemoteWork" AS ENUM ('NONE', 'PARTIAL', 'FULL');

-- CreateEnum
CREATE TYPE "Overtime" AS ENUM ('NONE', 'EXISTS');

-- CreateEnum
CREATE TYPE "SalaryType" AS ENUM ('HOURLY', 'DAILY', 'MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "SmokingMeasure" AS ENUM ('NO_SMOKING_INDOOR', 'SMOKING_ROOM', 'NO_MEASURE', 'OTHER');

-- CreateEnum
CREATE TYPE "AgeExceptionReason" AS ENUM ('RETIREMENT_AGE', 'LEGAL_RESTRICTION', 'YOUTH_CAREER', 'SKILL_SUCCESSION', 'ARTS', 'SENIOR_PROMOTION');

-- CreateEnum
CREATE TYPE "SeekerPostStatus" AS ENUM ('PUBLISHED', 'UNPUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ConversationOrigin" AS ENUM ('APPLICATION', 'INQUIRY', 'EMPLOYER_CONTACT');

-- CreateEnum
CREATE TYPE "BoardMessageKind" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('JOB_POST', 'SEEKER_POST', 'MESSAGE', 'USER');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('ILLEGAL', 'FALSE_INFO', 'DISCRIMINATION', 'HARASSMENT', 'SPAM', 'SCAM', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ModerationActionType" AS ENUM ('REQUEST_FIX', 'HIDE', 'UNHIDE', 'SUSPEND', 'UNSUSPEND');

-- CreateEnum
CREATE TYPE "InquiryCategory" AS ENUM ('COMPLAINT', 'QUESTION', 'OTHER');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "Feature" AS ENUM ('AXIS_ENGINE');

-- CreateEnum
CREATE TYPE "EntitlementSource" AS ENUM ('MANUAL', 'SUBSCRIPTION');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEventType" ADD VALUE 'ACCOUNT_CREATED';
ALTER TYPE "AuditEventType" ADD VALUE 'ACCOUNT_LOCKED';
ALTER TYPE "AuditEventType" ADD VALUE 'ACCOUNT_DELETED';
ALTER TYPE "AuditEventType" ADD VALUE 'JOB_PUBLISHED';
ALTER TYPE "AuditEventType" ADD VALUE 'JOB_UPDATED';
ALTER TYPE "AuditEventType" ADD VALUE 'JOB_CLOSED';
ALTER TYPE "AuditEventType" ADD VALUE 'JOB_EXPIRED';
ALTER TYPE "AuditEventType" ADD VALUE 'APPLICATION_CREATED';
ALTER TYPE "AuditEventType" ADD VALUE 'SEEKER_POST_PUBLISHED';
ALTER TYPE "AuditEventType" ADD VALUE 'SEEKER_POST_UNPUBLISHED';
ALTER TYPE "AuditEventType" ADD VALUE 'REPORT_CREATED';
ALTER TYPE "AuditEventType" ADD VALUE 'MODERATION_ACTION';
ALTER TYPE "AuditEventType" ADD VALUE 'INQUIRY_CREATED';
ALTER TYPE "AuditEventType" ADD VALUE 'ENTITLEMENT_GRANTED';
ALTER TYPE "AuditEventType" ADD VALUE 'RATE_LIMITED';

-- AlterEnum
ALTER TYPE "UserKind" ADD VALUE 'EMPLOYER';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "ageConfirmedAt" TIMESTAMPTZ(3),
ADD COLUMN     "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMPTZ(3),
ADD COLUMN     "notifyJobAlerts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyMessages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "suspendedAt" TIMESTAMPTZ(3),
ADD COLUMN     "suspendedReason" TEXT,
ADD COLUMN     "termsAcceptedAt" TIMESTAMPTZ(3),
ADD COLUMN     "termsVersion" TEXT;

-- CreateTable
CREATE TABLE "employer_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "companyName" TEXT NOT NULL,
    "prefecture" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "businessDescription" TEXT NOT NULL,
    "contactName" TEXT,
    "websiteUrl" TEXT,
    "corporateNumber" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "employer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seeker_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "desiredCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "desiredPrefectures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experience" TEXT,
    "qualifications" TEXT,
    "selfIntroduction" TEXT,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "seeker_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_posts" (
    "id" UUID NOT NULL,
    "employerId" UUID NOT NULL,
    "status" "JobPostStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL DEFAULT '',
    "category" TEXT,
    "employmentType" "EmploymentType",
    "jobDescription" TEXT,
    "jobChangeScope" TEXT,
    "contractType" "ContractType",
    "contractTermText" TEXT,
    "renewalPolicy" "RenewalPolicy",
    "renewalCapText" TEXT,
    "trialPeriodText" TEXT,
    "prefecture" TEXT,
    "city" TEXT,
    "addressDetail" TEXT,
    "remoteWork" "RemoteWork" NOT NULL DEFAULT 'NONE',
    "locationChangeScope" TEXT,
    "workHoursText" TEXT,
    "overtime" "Overtime",
    "overtimeText" TEXT,
    "breakText" TEXT,
    "holidaysText" TEXT,
    "salaryType" "SalaryType",
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryNote" TEXT,
    "fixedOvertimePay" BOOLEAN NOT NULL DEFAULT false,
    "insurance" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "smokingMeasure" "SmokingMeasure",
    "smokingText" TEXT,
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "ageExceptionReason" "AgeExceptionReason",
    "complianceConfirmedAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMPTZ(3),
    "contentUpdatedAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3),
    "closedAt" TIMESTAMPTZ(3),
    "hiddenAt" TIMESTAMPTZ(3),
    "hiddenReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "job_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_post_revisions" (
    "id" UUID NOT NULL,
    "jobPostId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_post_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "jobPostId" UUID NOT NULL,
    "seekerId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "sharedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sharedProfile" JSONB NOT NULL,
    "jobVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seeker_posts" (
    "id" UUID NOT NULL,
    "seekerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "desiredCategory" TEXT,
    "desiredPrefecture" TEXT,
    "employmentTypes" "EmploymentType"[] DEFAULT ARRAY[]::"EmploymentType"[],
    "status" "SeekerPostStatus" NOT NULL DEFAULT 'UNPUBLISHED',
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "seeker_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "seekerId" UUID NOT NULL,
    "employerId" UUID NOT NULL,
    "origin" "ConversationOrigin" NOT NULL,
    "jobPostId" UUID,
    "seekerPostId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seekerLastReadAt" TIMESTAMPTZ(3),
    "employerLastReadAt" TIMESTAMPTZ(3),

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "senderId" UUID,
    "kind" "BoardMessageKind" NOT NULL DEFAULT 'USER',
    "bodyEncrypted" TEXT,
    "systemEvent" TEXT,
    "systemPayload" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" UUID NOT NULL,
    "blockerId" UUID NOT NULL,
    "blockedId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" UUID NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "detail" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstHandledAt" TIMESTAMPTZ(3),
    "resolvedAt" TIMESTAMPTZ(3),
    "resolutionNote" TEXT,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_evidence" (
    "id" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "messageId" UUID,
    "sentAt" TIMESTAMPTZ(3) NOT NULL,
    "senderRole" TEXT NOT NULL,
    "bodyPlain" TEXT NOT NULL,

    CONSTRAINT "report_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" UUID NOT NULL,
    "operatorId" UUID NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" UUID NOT NULL,
    "action" "ModerationActionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "fixDeadline" TIMESTAMPTZ(3),
    "reportId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "email" TEXT NOT NULL,
    "category" "InquiryCategory" NOT NULL,
    "body" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'OPEN',
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstHandledAt" TIMESTAMPTZ(3),
    "closedAt" TIMESTAMPTZ(3),
    "notes" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" UUID NOT NULL,
    "seekerId" UUID NOT NULL,
    "criteria" JSONB NOT NULL,
    "notify" BOOLEAN NOT NULL DEFAULT true,
    "lastNotifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_entitlements" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "feature" "Feature" NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMPTZ(3),
    "source" "EntitlementSource" NOT NULL DEFAULT 'MANUAL',
    "grantedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employer_profiles_userId_key" ON "employer_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "seeker_profiles_userId_key" ON "seeker_profiles"("userId");

-- CreateIndex
CREATE INDEX "job_posts_status_expiresAt_idx" ON "job_posts"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "job_posts_status_publishedAt_idx" ON "job_posts"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "job_posts_employerId_status_idx" ON "job_posts"("employerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "job_post_revisions_jobPostId_version_key" ON "job_post_revisions"("jobPostId", "version");

-- CreateIndex
CREATE INDEX "applications_seekerId_idx" ON "applications"("seekerId");

-- CreateIndex
CREATE UNIQUE INDEX "applications_jobPostId_seekerId_key" ON "applications"("jobPostId", "seekerId");

-- CreateIndex
CREATE INDEX "seeker_posts_status_publishedAt_idx" ON "seeker_posts"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "conversations_seekerId_lastMessageAt_idx" ON "conversations"("seekerId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "conversations_employerId_lastMessageAt_idx" ON "conversations"("employerId", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_seekerId_employerId_key" ON "conversations"("seekerId", "employerId");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_senderId_createdAt_idx" ON "messages"("senderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_blockerId_blockedId_key" ON "blocks"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "reports_status_receivedAt_idx" ON "reports"("status", "receivedAt");

-- CreateIndex
CREATE INDEX "moderation_actions_targetType_targetId_idx" ON "moderation_actions"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "inquiries_status_receivedAt_idx" ON "inquiries"("status", "receivedAt");

-- CreateIndex
CREATE INDEX "saved_searches_seekerId_idx" ON "saved_searches"("seekerId");

-- CreateIndex
CREATE INDEX "feature_entitlements_userId_feature_idx" ON "feature_entitlements"("userId", "feature");

-- AddForeignKey
ALTER TABLE "employer_profiles" ADD CONSTRAINT "employer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeker_profiles" ADD CONSTRAINT "seeker_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_posts" ADD CONSTRAINT "job_posts_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_post_revisions" ADD CONSTRAINT "job_post_revisions_jobPostId_fkey" FOREIGN KEY ("jobPostId") REFERENCES "job_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_jobPostId_fkey" FOREIGN KEY ("jobPostId") REFERENCES "job_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_seekerId_fkey" FOREIGN KEY ("seekerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeker_posts" ADD CONSTRAINT "seeker_posts_seekerId_fkey" FOREIGN KEY ("seekerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_seekerId_fkey" FOREIGN KEY ("seekerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_jobPostId_fkey" FOREIGN KEY ("jobPostId") REFERENCES "job_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_seekerPostId_fkey" FOREIGN KEY ("seekerPostId") REFERENCES "seeker_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_evidence" ADD CONSTRAINT "report_evidence_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_evidence" ADD CONSTRAINT "report_evidence_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_seekerId_fkey" FOREIGN KEY ("seekerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_entitlements" ADD CONSTRAINT "feature_entitlements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_entitlements" ADD CONSTRAINT "feature_entitlements_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- キーワード検索用の部分一致インデックス（research R4）
CREATE INDEX "job_posts_title_trgm_idx" ON "job_posts" USING gin ("title" gin_trgm_ops);
CREATE INDEX "job_posts_description_trgm_idx" ON "job_posts" USING gin ("jobDescription" gin_trgm_ops);
CREATE INDEX "employer_profiles_company_trgm_idx" ON "employer_profiles" USING gin ("companyName" gin_trgm_ops);
