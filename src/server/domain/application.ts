import "server-only";
import { SHAREABLE_PROFILE_FIELDS, type ShareableProfileField } from "@/lib/master-data";
import { DomainError } from "@/lib/result";
import { recordAudit } from "@/server/audit";
import { assertCanAct } from "@/server/auth/guards";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { enqueue, QUEUES } from "@/server/jobs";
import { authorizeBoard } from "@/server/policy/board";
import { assertWithinLimit } from "@/server/rate-limit-db";
import {
  addSystemMessage,
  addUserMessage,
  assertCanMessage,
  getOrCreateConversation,
  MESSAGE_MAX,
  toBoardActor,
} from "./conversation";
import { isOpen } from "./job-post";

/**
 * 応募・質問（T045 / FR-022〜FR-024）。
 * 企業に渡るのは、求職者が選んだプロフィールの項目を、応募した時点でコピーしたものだけ（原則IV）。
 */

const FIELDS = Object.keys(SHAREABLE_PROFILE_FIELDS) as ShareableProfileField[];

async function openJobFor(actor: SessionUser, jobId: string) {
  const job = await db.jobPost.findFirst({
    where: { id: jobId, employer: { deletedAt: null, suspendedAt: null } },
    select: {
      id: true,
      title: true,
      employerId: true,
      status: true,
      expiresAt: true,
      version: true,
    },
  });
  if (!job) throw new DomainError("NOT_FOUND", "見つかりませんでした");
  if (!isOpen(job)) throw new DomainError("CONFLICT", "この求人の募集は終了しました");
  if (job.employerId === actor.userId) throw new DomainError("NOT_FOUND", "見つかりませんでした");
  return job;
}

function checkBody(body: string | undefined) {
  const text = body?.trim() ?? "";
  if (text.length > MESSAGE_MAX)
    throw new DomainError("VALIDATION", `メッセージは${MESSAGE_MAX}文字までです`);
  return text;
}

/** 応募する */
export async function apply(
  actor: SessionUser,
  input: { jobId: string; sharedFields: string[]; firstMessage?: string },
) {
  assertCanAct(actor);
  authorizeBoard(toBoardActor(actor), "application.create");
  const job = await openJobFor(actor, input.jobId);
  const profile = await db.seekerProfile.findUnique({ where: { userId: actor.userId } });
  if (!profile) throw new DomainError("CONFLICT", "先にプロフィール（表示名）を登録してください");

  const already = await db.application.findUnique({
    where: { jobPostId_seekerId: { jobPostId: job.id, seekerId: actor.userId } },
  });
  if (already) throw new DomainError("CONFLICT", "この求人にはすでに応募しています");
  await assertCanMessage(actor.userId, job.employerId);
  const body = checkBody(input.firstMessage);

  const sharedFields = input.sharedFields.filter((f): f is ShareableProfileField =>
    (FIELDS as string[]).includes(f),
  );
  // 共有するのは選んだ項目だけ。表示名は会話の相手として常に見える
  const sharedProfile: Record<string, unknown> = { displayName: profile.displayName };
  for (const f of sharedFields) sharedProfile[f] = profile[f];

  const existingConversation = await db.conversation.findUnique({
    where: { seekerId_employerId: { seekerId: actor.userId, employerId: job.employerId } },
    select: { id: true },
  });
  if (!existingConversation) await assertWithinLimit("newConversation", actor.userId, actor.userId);
  if (body) await assertWithinLimit("message", actor.userId, actor.userId);

  const result = await db.$transaction(async (tx) => {
    const { conversation } = await getOrCreateConversation(tx, {
      seekerId: actor.userId,
      employerId: job.employerId,
      origin: "APPLICATION",
      jobPostId: job.id,
    });
    const application = await tx.application.create({
      data: {
        jobPostId: job.id,
        seekerId: actor.userId,
        conversationId: conversation.id,
        sharedFields,
        sharedProfile: sharedProfile as object,
        jobVersion: job.version,
      },
    });
    await addSystemMessage(tx, conversation.id, "APPLIED", { jobPostId: job.id, title: job.title });
    if (body) await addUserMessage(tx, conversation.id, actor.userId, body);
    await recordAudit(
      {
        type: "APPLICATION_CREATED",
        actorUserId: actor.userId,
        metadata: { itemCount: sharedFields.length },
      },
      tx,
    );
    return { applicationId: application.id, conversationId: conversation.id };
  });
  await enqueue(
    QUEUES.messageDigest,
    { conversationId: result.conversationId, recipientId: job.employerId },
    {
      startAfterSeconds: 5 * 60,
      singletonKey: `${result.conversationId}:${job.employerId}`,
      singletonSeconds: 30 * 60,
    },
  );
  return result;
}

/** 応募せずに質問する */
export async function askQuestion(actor: SessionUser, input: { jobId: string; body: string }) {
  assertCanAct(actor);
  authorizeBoard(toBoardActor(actor), "application.create");
  const job = await openJobFor(actor, input.jobId);
  const profile = await db.seekerProfile.findUnique({
    where: { userId: actor.userId },
    select: { id: true },
  });
  if (!profile) throw new DomainError("CONFLICT", "先にプロフィール（表示名）を登録してください");
  const body = checkBody(input.body);
  if (!body) throw new DomainError("VALIDATION", "質問を書いてください");
  await assertCanMessage(actor.userId, job.employerId);
  const existing = await db.conversation.findUnique({
    where: { seekerId_employerId: { seekerId: actor.userId, employerId: job.employerId } },
    select: { id: true },
  });
  if (!existing) await assertWithinLimit("newConversation", actor.userId, actor.userId);
  await assertWithinLimit("message", actor.userId, actor.userId);

  const conversationId = await db.$transaction(async (tx) => {
    const { conversation } = await getOrCreateConversation(tx, {
      seekerId: actor.userId,
      employerId: job.employerId,
      origin: "INQUIRY",
      jobPostId: job.id,
    });
    await addSystemMessage(tx, conversation.id, "INQUIRY", { jobPostId: job.id, title: job.title });
    await addUserMessage(tx, conversation.id, actor.userId, body);
    return conversation.id;
  });
  await enqueue(
    QUEUES.messageDigest,
    { conversationId, recipientId: job.employerId },
    {
      startAfterSeconds: 5 * 60,
      singletonKey: `${conversationId}:${job.employerId}`,
      singletonSeconds: 30 * 60,
    },
  );
  return { conversationId };
}

export async function listMyApplications(actor: SessionUser) {
  return db.application.findMany({
    where: { seekerId: actor.userId },
    orderBy: { createdAt: "desc" },
    include: {
      jobPost: {
        select: {
          id: true,
          title: true,
          status: true,
          expiresAt: true,
          employer: { select: { employerProfile: { select: { companyName: true } } } },
        },
      },
    },
  });
}

export async function hasApplied(actor: SessionUser, jobId: string) {
  const a = await db.application.findUnique({
    where: { jobPostId_seekerId: { jobPostId: jobId, seekerId: actor.userId } },
  });
  return a?.conversationId ?? null;
}
