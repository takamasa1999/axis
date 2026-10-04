import "server-only";
import type { ConversationOrigin } from "@/generated/prisma/enums";
import { DomainError } from "@/lib/result";
import { assertCanAct } from "@/server/auth/guards";
import type { SessionUser } from "@/server/auth/session";
import { decryptMessage, encryptMessage } from "@/server/crypto/message";
import { db, type Tx } from "@/server/db";
import { enqueue, QUEUES } from "@/server/jobs";
import { authorizeBoard, type BoardActor } from "@/server/policy/board";
import { assertWithinLimit } from "@/server/rate-limit-db";

/**
 * 会話とメッセージ（T044 / FR-024〜FR-030）。
 * - 本文はアプリ側で暗号化して保存する。運営は読めない（会話を読む権限が運営にない）
 * - システムのお知らせ（SYSTEM）は利用者の本文と別に保存し、本文を加工しない
 */

export const MESSAGE_MAX = 2000;
export const DELETED_NAME = "退会したユーザー";

export type SystemEvent = "APPLIED" | "INQUIRY" | "CONTACT_FROM_POST" | "JOB_CONDITIONS_CHANGED";

/** システムのお知らせの文面（表示のときに組み立てる。本文は保存しない） */
export function systemText(event: string | null, payload: unknown): string {
  const p = (payload ?? {}) as { title?: string };
  const title = p.title ? `「${p.title}」` : "";
  switch (event) {
    case "APPLIED":
      return `求人${title}に応募しました`;
    case "INQUIRY":
      return `求人${title}について質問が届きました`;
    case "CONTACT_FROM_POST":
      return `求職の投稿${title}を見て、企業から声がかかりました`;
    case "JOB_CONDITIONS_CHANGED":
      return `求人${title}の労働条件が変更されました。求人のページで最新の内容を確認してください`;
    default:
      return "お知らせ";
  }
}

export function toBoardActor(user: SessionUser): BoardActor {
  return {
    userId: user.userId,
    kind: user.kind,
    isOperator: user.isOperator,
    suspended: user.suspended,
  };
}

/** 求職者と企業の会話を取得する。なければ作る（同じ組み合わせは1つ） */
export async function getOrCreateConversation(
  tx: Tx,
  input: {
    seekerId: string;
    employerId: string;
    origin: ConversationOrigin;
    jobPostId?: string;
    seekerPostId?: string;
  },
) {
  const existing = await tx.conversation.findUnique({
    where: { seekerId_employerId: { seekerId: input.seekerId, employerId: input.employerId } },
  });
  if (existing) return { conversation: existing, created: false };
  const conversation = await tx.conversation.create({
    data: {
      seekerId: input.seekerId,
      employerId: input.employerId,
      origin: input.origin,
      jobPostId: input.jobPostId ?? null,
      seekerPostId: input.seekerPostId ?? null,
    },
  });
  return { conversation, created: true };
}

export async function addSystemMessage(
  tx: Tx,
  conversationId: string,
  event: SystemEvent,
  payload: object,
) {
  const now = new Date();
  await tx.message.create({
    data: {
      conversationId,
      kind: "SYSTEM",
      systemEvent: event,
      systemPayload: payload,
      createdAt: now,
    },
  });
  await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } });
}

/** 利用者の本文を暗号化して保存する（書き換えない） */
export async function addUserMessage(
  tx: Tx,
  conversationId: string,
  senderId: string,
  body: string,
) {
  const now = new Date();
  const message = await tx.message.create({
    data: {
      conversationId,
      senderId,
      kind: "USER",
      bodyEncrypted: encryptMessage(body),
      createdAt: now,
    },
  });
  const conversation = await tx.conversation.findUniqueOrThrow({ where: { id: conversationId } });
  await tx.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: now,
      // 自分が送ったメッセージは既読にする
      ...(conversation.seekerId === senderId
        ? { seekerLastReadAt: now }
        : { employerLastReadAt: now }),
    },
  });
  return message;
}

/** どちらかがどちらかをブロックしていれば true */
export async function isBlockedBetween(a: string, b: string, tx: Tx | typeof db = db) {
  const block = await tx.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  return block !== null;
}

/** 送信できる状態か（相手の退会・停止・ブロック）を確かめる */
export async function assertCanMessage(
  senderId: string,
  recipientId: string,
  tx: Tx | typeof db = db,
) {
  const recipient = await tx.user.findUnique({
    where: { id: recipientId },
    select: { deletedAt: true, suspendedAt: true },
  });
  if (!recipient || recipient.deletedAt)
    throw new DomainError("CONFLICT", "相手が退会しているため、送信できません");
  if (recipient.suspendedAt || (await isBlockedBetween(senderId, recipientId, tx))) {
    // ブロックされたことは伝えない（FR-028）
    throw new DomainError("BLOCKED", "このメッセージは送信できません");
  }
}

async function getAccessibleConversation(actor: SessionUser, conversationId: string) {
  const conversation = await db.conversation.findUnique({ where: { id: conversationId } });
  authorizeBoard(toBoardActor(actor), "conversation.access", {
    type: "conversation",
    seekerId: conversation?.seekerId ?? "",
    employerId: conversation?.employerId ?? "",
  });
  if (!conversation) throw new DomainError("NOT_FOUND", "見つかりませんでした");
  return conversation;
}

/** メッセージを送る（FR-024, FR-025, FR-028, FR-037） */
export async function sendMessage(actor: SessionUser, conversationId: string, body: string) {
  assertCanAct(actor);
  const text = body.trim();
  if (text.length < 1 || text.length > MESSAGE_MAX) {
    throw new DomainError("VALIDATION", `メッセージは1〜${MESSAGE_MAX}文字で書いてください`);
  }
  const conversation = await getAccessibleConversation(actor, conversationId);
  const recipientId =
    conversation.seekerId === actor.userId ? conversation.employerId : conversation.seekerId;
  await assertCanMessage(actor.userId, recipientId);
  await assertWithinLimit("message", actor.userId, actor.userId);

  const message = await db.$transaction((tx) =>
    addUserMessage(tx, conversationId, actor.userId, text),
  );
  // 5分後に、まだ読まれていなければメールで知らせる（同じ会話は30分に1回まで）
  await enqueue(
    QUEUES.messageDigest,
    { conversationId, recipientId },
    {
      startAfterSeconds: 5 * 60,
      singletonKey: `${conversationId}:${recipientId}`,
      singletonSeconds: 30 * 60,
    },
  );
  return { id: message.id, createdAt: message.createdAt };
}

type ViewMessage = {
  id: string;
  kind: "USER" | "SYSTEM";
  sender: "me" | "them" | "system";
  body: string;
  createdAt: string;
};

function toView(
  actorId: string,
  m: {
    id: string;
    kind: "USER" | "SYSTEM";
    senderId: string | null;
    bodyEncrypted: string | null;
    systemEvent: string | null;
    systemPayload: unknown;
    createdAt: Date;
  },
): ViewMessage {
  if (m.kind === "SYSTEM") {
    return {
      id: m.id,
      kind: "SYSTEM",
      sender: "system",
      body: systemText(m.systemEvent, m.systemPayload),
      createdAt: m.createdAt.toISOString(),
    };
  }
  return {
    id: m.id,
    kind: "USER",
    sender: m.senderId === actorId ? "me" : "them",
    body: m.bodyEncrypted ? decryptMessage(m.bodyEncrypted) : "",
    createdAt: m.createdAt.toISOString(),
  };
}

/** 会話の相手の表示名 */
async function counterpartOf(
  actor: SessionUser,
  conversation: { seekerId: string; employerId: string },
) {
  if (actor.userId === conversation.seekerId) {
    const employer = await db.user.findUnique({
      where: { id: conversation.employerId },
      select: { id: true, deletedAt: true, employerProfile: { select: { companyName: true } } },
    });
    return {
      id: conversation.employerId,
      name: employer?.deletedAt ? DELETED_NAME : (employer?.employerProfile?.companyName ?? "企業"),
      role: "EMPLOYER" as const,
    };
  }
  const seeker = await db.user.findUnique({
    where: { id: conversation.seekerId },
    select: { deletedAt: true, seekerProfile: { select: { displayName: true } } },
  });
  return {
    id: conversation.seekerId,
    name: seeker?.deletedAt ? DELETED_NAME : (seeker?.seekerProfile?.displayName ?? "求職者"),
    role: "PERSON" as const,
  };
}

/** 会話の画面用：相手、メッセージ、（企業なら）応募で共有された内容 */
export async function getConversationView(actor: SessionUser, conversationId: string) {
  const conversation = await getAccessibleConversation(actor, conversationId);
  const [messages, counterpart, blockedByMe, applications] = await Promise.all([
    db.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" }, take: 500 }),
    counterpartOf(actor, conversation),
    db.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: actor.userId,
          blockedId:
            actor.userId === conversation.seekerId
              ? conversation.employerId
              : conversation.seekerId,
        },
      },
    }),
    db.application.findMany({
      where: { conversationId },
      include: { jobPost: { select: { id: true, title: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  return {
    conversation,
    counterpart,
    blockedByMe: blockedByMe !== null,
    applications: applications.map((a) => ({
      id: a.id,
      jobPostId: a.jobPost.id,
      jobTitle: a.jobPost.title,
      sharedProfile: a.sharedProfile as Record<string, unknown>,
      createdAt: a.createdAt,
    })),
    messages: messages.map((m) => toView(actor.userId, m)),
  };
}

/** 差分の取得（3秒ごとのポーリング用） */
export async function getMessagesAfter(
  actor: SessionUser,
  conversationId: string,
  afterId?: string,
) {
  const conversation = await getAccessibleConversation(actor, conversationId);
  let after: Date | undefined;
  if (afterId) {
    const anchor = await db.message.findFirst({
      where: { id: afterId, conversationId },
      select: { createdAt: true },
    });
    after = anchor?.createdAt;
  }
  const messages = await db.message.findMany({
    where: { conversationId, ...(after ? { createdAt: { gt: after } } : {}) },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  const counterpartLastReadAt =
    actor.userId === conversation.seekerId
      ? conversation.employerLastReadAt
      : conversation.seekerLastReadAt;
  return { messages: messages.map((m) => toView(actor.userId, m)), counterpartLastReadAt };
}

export async function markRead(actor: SessionUser, conversationId: string) {
  const conversation = await getAccessibleConversation(actor, conversationId);
  const now = new Date();
  await db.conversation.update({
    where: { id: conversation.id },
    data:
      actor.userId === conversation.seekerId
        ? { seekerLastReadAt: now }
        : { employerLastReadAt: now },
  });
}

/** 会話の一覧（相手の名前、最後のメッセージの一部、未読） */
export async function listConversations(actor: SessionUser) {
  const where = actor.kind === "PERSON" ? { seekerId: actor.userId } : { employerId: actor.userId };
  const conversations = await db.conversation.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      seeker: { select: { deletedAt: true, seekerProfile: { select: { displayName: true } } } },
      employer: { select: { deletedAt: true, employerProfile: { select: { companyName: true } } } },
    },
  });
  return conversations.map((c) => {
    const isSeeker = actor.userId === c.seekerId;
    const name = isSeeker
      ? c.employer.deletedAt
        ? DELETED_NAME
        : (c.employer.employerProfile?.companyName ?? "企業")
      : c.seeker.deletedAt
        ? DELETED_NAME
        : (c.seeker.seekerProfile?.displayName ?? "求職者");
    const last = c.messages[0];
    const lastRead = isSeeker ? c.seekerLastReadAt : c.employerLastReadAt;
    const preview = last ? toView(actor.userId, last).body.slice(0, 60) : "";
    return {
      id: c.id,
      name,
      preview,
      lastMessageAt: c.lastMessageAt,
      unread: Boolean(
        last && last.senderId !== actor.userId && (!lastRead || last.createdAt > lastRead),
      ),
    };
  });
}

/** ブロック（FR-028） */
export async function block(actor: SessionUser, conversationId: string) {
  const conversation = await getAccessibleConversation(actor, conversationId);
  const blockedId =
    actor.userId === conversation.seekerId ? conversation.employerId : conversation.seekerId;
  await db.block.upsert({
    where: { blockerId_blockedId: { blockerId: actor.userId, blockedId } },
    update: {},
    create: { blockerId: actor.userId, blockedId },
  });
}

export async function unblock(actor: SessionUser, conversationId: string) {
  const conversation = await getAccessibleConversation(actor, conversationId);
  const blockedId =
    actor.userId === conversation.seekerId ? conversation.employerId : conversation.seekerId;
  await db.block.deleteMany({ where: { blockerId: actor.userId, blockedId } });
}
