import "server-only";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db";

/** 未読のある会話の数（ヘッダー・下部タブのバッジ用） */
export async function countUnreadConversations(user: SessionUser): Promise<number> {
  if (user.kind === "PERSON") {
    return db.$queryRaw<{ n: bigint }[]>`
      SELECT count(*)::bigint AS n FROM conversations
      WHERE "seekerId" = ${user.userId}::uuid
        AND ("seekerLastReadAt" IS NULL OR "lastMessageAt" > "seekerLastReadAt")
        AND EXISTS (SELECT 1 FROM messages m WHERE m."conversationId" = conversations.id
                    AND (m."senderId" IS NULL OR m."senderId" <> ${user.userId}::uuid)
                    AND (conversations."seekerLastReadAt" IS NULL OR m."createdAt" > conversations."seekerLastReadAt"))
    `.then((r) => Number(r[0]?.n ?? 0));
  }
  if (user.kind === "EMPLOYER") {
    return db.$queryRaw<{ n: bigint }[]>`
      SELECT count(*)::bigint AS n FROM conversations
      WHERE "employerId" = ${user.userId}::uuid
        AND ("employerLastReadAt" IS NULL OR "lastMessageAt" > "employerLastReadAt")
        AND EXISTS (SELECT 1 FROM messages m WHERE m."conversationId" = conversations.id
                    AND (m."senderId" IS NULL OR m."senderId" <> ${user.userId}::uuid)
                    AND (conversations."employerLastReadAt" IS NULL OR m."createdAt" > conversations."employerLastReadAt"))
    `.then((r) => Number(r[0]?.n ?? 0));
  }
  return 0;
}
