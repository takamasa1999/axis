import { env } from "@/lib/env";
import { db } from "@/server/db";
import { DELETED_NAME } from "@/server/domain/conversation";
import { newMessageMail, sendMail } from "@/server/mail";

/**
 * 新着メッセージのメール通知（T051 / FR-026）。送信の5分後に実行し、まだ読まれていなければ知らせる。
 * メールに本文は入れない。
 */
export async function handleMessageDigest(data: { conversationId: string; recipientId: string }) {
  const conversation = await db.conversation.findUnique({
    where: { id: data.conversationId },
    include: {
      seeker: { select: { deletedAt: true, seekerProfile: { select: { displayName: true } } } },
      employer: { select: { deletedAt: true, employerProfile: { select: { companyName: true } } } },
    },
  });
  if (!conversation) return;
  const recipient = await db.user.findUnique({
    where: { id: data.recipientId },
    select: { email: true, notifyMessages: true, deletedAt: true },
  });
  if (!recipient || recipient.deletedAt || !recipient.notifyMessages) return;

  const recipientIsSeeker = data.recipientId === conversation.seekerId;
  const lastRead = recipientIsSeeker
    ? conversation.seekerLastReadAt
    : conversation.employerLastReadAt;
  const unread = await db.message.count({
    where: {
      conversationId: conversation.id,
      senderId: { not: data.recipientId },
      ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
    },
  });
  if (unread === 0) return;

  const counterpart = recipientIsSeeker
    ? conversation.employer.deletedAt
      ? DELETED_NAME
      : (conversation.employer.employerProfile?.companyName ?? "企業")
    : conversation.seeker.deletedAt
      ? DELETED_NAME
      : (conversation.seeker.seekerProfile?.displayName ?? "求職者");
  await sendMail(
    newMessageMail(recipient.email, `${env().APP_URL}/messages/${conversation.id}`, counterpart),
  );
}
