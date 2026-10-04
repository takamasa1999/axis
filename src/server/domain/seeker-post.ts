import "server-only";
import { z } from "zod";
import { EMPLOYMENT_TYPE_KEYS, JOB_CATEGORY_KEYS, PREFECTURES } from "@/lib/master-data";
import { DomainError } from "@/lib/result";
import { recordAudit } from "@/server/audit";
import { assertCanAct } from "@/server/auth/guards";
import type { SessionUser } from "@/server/auth/session";
import { checkContactInfo } from "@/server/compliance/text-checks";
import { db } from "@/server/db";
import { enqueue, QUEUES } from "@/server/jobs";
import { authorizeBoard, NotFoundError } from "@/server/policy/board";
import { assertWithinLimit } from "@/server/rate-limit-db";
import {
  addSystemMessage,
  addUserMessage,
  assertCanMessage,
  getOrCreateConversation,
  MESSAGE_MAX,
  toBoardActor,
} from "./conversation";

/**
 * 求職の投稿（T052 / FR-031〜FR-033）と、企業からの声かけ（T054）。
 * 見られるのはログインした企業だけ。連絡先らしき文字列があれば公開前に注意する。
 */
export const MAX_PUBLISHED = 3;

export const SeekerPostSchema = z.object({
  title: z.string().trim().min(1, "タイトルを入れてください").max(60),
  body: z.string().trim().min(1, "本文を入れてください").max(2000),
  desiredCategory: z
    .enum(JOB_CATEGORY_KEYS as unknown as [string, ...string[]])
    .nullish()
    .transform((v) => v ?? null),
  desiredPrefecture: z
    .enum(PREFECTURES)
    .nullish()
    .transform((v) => v ?? null),
  employmentTypes: z
    .array(z.enum(EMPLOYMENT_TYPE_KEYS as unknown as [string, ...string[]]))
    .max(4)
    .default([]),
});
export type SeekerPostInput = z.output<typeof SeekerPostSchema>;

async function getOwnPost(actor: SessionUser, postId: string) {
  const post = await db.seekerPost.findUnique({ where: { id: postId } });
  authorizeBoard(toBoardActor(actor), "seekerPost.manage", {
    type: "seekerPost",
    seekerId: post?.seekerId ?? "",
    published: post?.status === "PUBLISHED",
  });
  if (!post) throw new NotFoundError();
  return post;
}

export function contactWarnings(post: Pick<SeekerPostInput, "title" | "body">) {
  return checkContactInfo(`${post.title}\n${post.body}`);
}

export async function saveSeekerPost(
  actor: SessionUser,
  postId: string | null,
  input: SeekerPostInput,
) {
  assertCanAct(actor);
  if (actor.kind !== "PERSON") throw new NotFoundError();
  const data = { ...input, employmentTypes: input.employmentTypes as never };
  if (!postId) {
    const post = await db.seekerPost.create({
      data: { ...data, seekerId: actor.userId, status: "UNPUBLISHED" },
    });
    return { postId: post.id, warnings: contactWarnings(input) };
  }
  const post = await getOwnPost(actor, postId);
  if (post.status === "HIDDEN") throw new DomainError("CONFLICT", "運営が公開を止めている投稿です");
  await db.seekerPost.update({ where: { id: postId }, data });
  return { postId, warnings: contactWarnings(input) };
}

/** 公開する。連絡先らしき文字列があれば、確認（acknowledgeWarnings）がない限り止めて注意を返す */
export async function publishSeekerPost(
  actor: SessionUser,
  postId: string,
  acknowledgeWarnings: boolean,
) {
  assertCanAct(actor);
  const post = await getOwnPost(actor, postId);
  if (post.status === "HIDDEN") throw new DomainError("CONFLICT", "運営が公開を止めている投稿です");
  if (post.status === "PUBLISHED") return { published: true, warnings: [] };
  const warnings = contactWarnings(post);
  if (warnings.length > 0 && !acknowledgeWarnings) return { published: false, warnings };
  const count = await db.seekerPost.count({
    where: { seekerId: actor.userId, status: "PUBLISHED" },
  });
  if (count >= MAX_PUBLISHED)
    throw new DomainError("CONFLICT", `公開できる投稿は${MAX_PUBLISHED}件までです`);
  await db.$transaction(async (tx) => {
    await tx.seekerPost.update({
      where: { id: postId },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
    await recordAudit({ type: "SEEKER_POST_PUBLISHED", actorUserId: actor.userId }, tx);
  });
  return { published: true, warnings };
}

export async function unpublishSeekerPost(actor: SessionUser, postId: string) {
  const post = await getOwnPost(actor, postId);
  if (post.status !== "PUBLISHED") return;
  await db.$transaction(async (tx) => {
    await tx.seekerPost.update({ where: { id: postId }, data: { status: "UNPUBLISHED" } });
    await recordAudit({ type: "SEEKER_POST_UNPUBLISHED", actorUserId: actor.userId }, tx);
  });
}

export async function listOwnPosts(actor: SessionUser) {
  return db.seekerPost.findMany({
    where: { seekerId: actor.userId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getOwnPostForEdit(actor: SessionUser, postId: string) {
  return getOwnPost(actor, postId);
}

const publishedWhere = {
  status: "PUBLISHED" as const,
  seeker: { deletedAt: null, suspendedAt: null },
};

/** 企業向けの一覧（新着順。運営の判断による並びはない） */
export async function listPublishedPosts(
  actor: SessionUser,
  filter: { category?: string; prefecture?: string } = {},
) {
  if (actor.kind !== "EMPLOYER") throw new NotFoundError();
  return db.seekerPost.findMany({
    where: {
      ...publishedWhere,
      ...(filter.category ? { desiredCategory: filter.category } : {}),
      ...(filter.prefecture ? { desiredPrefecture: filter.prefecture } : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: 100,
    include: { seeker: { select: { seekerProfile: { select: { displayName: true } } } } },
  });
}

export async function getPublishedPost(actor: SessionUser, postId: string) {
  const post = await db.seekerPost.findFirst({
    where: { id: postId, seeker: { deletedAt: null, suspendedAt: null } },
    include: { seeker: { select: { seekerProfile: { select: { displayName: true } } } } },
  });
  authorizeBoard(toBoardActor(actor), "seekerPost.view", {
    type: "seekerPost",
    seekerId: post?.seekerId ?? "",
    published: post?.status === "PUBLISHED",
  });
  if (!post) throw new NotFoundError();
  return post;
}

/** 企業から声をかける（会話を作るか、既存の会話に送る） */
export async function contactSeeker(actor: SessionUser, postId: string, body: string) {
  assertCanAct(actor);
  const post = await getPublishedPost(actor, postId);
  if (actor.kind !== "EMPLOYER" || post.status !== "PUBLISHED") throw new NotFoundError();
  const profile = await db.employerProfile.findUnique({
    where: { userId: actor.userId },
    select: { id: true },
  });
  if (!profile) throw new DomainError("CONFLICT", "先に会社・お店のプロフィールを登録してください");
  const text = body.trim();
  if (!text || text.length > MESSAGE_MAX)
    throw new DomainError("VALIDATION", `メッセージは1〜${MESSAGE_MAX}文字で書いてください`);
  await assertCanMessage(actor.userId, post.seekerId);
  const existing = await db.conversation.findUnique({
    where: { seekerId_employerId: { seekerId: post.seekerId, employerId: actor.userId } },
    select: { id: true },
  });
  if (!existing) await assertWithinLimit("newConversation", actor.userId, actor.userId);
  await assertWithinLimit("message", actor.userId, actor.userId);

  const conversationId = await db.$transaction(async (tx) => {
    const { conversation } = await getOrCreateConversation(tx, {
      seekerId: post.seekerId,
      employerId: actor.userId,
      origin: "EMPLOYER_CONTACT",
      seekerPostId: post.id,
    });
    await addSystemMessage(tx, conversation.id, "CONTACT_FROM_POST", {
      seekerPostId: post.id,
      title: post.title,
    });
    await addUserMessage(tx, conversation.id, actor.userId, text);
    return conversation.id;
  });
  await enqueue(
    QUEUES.messageDigest,
    { conversationId, recipientId: post.seekerId },
    {
      startAfterSeconds: 5 * 60,
      singletonKey: `${conversationId}:${post.seekerId}`,
      singletonSeconds: 30 * 60,
    },
  );
  return { conversationId };
}
