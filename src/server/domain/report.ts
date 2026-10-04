import "server-only";
import type { ReportReason, ReportTargetType } from "@/generated/prisma/enums";
import { DomainError } from "@/lib/result";
import { recordAudit } from "@/server/audit";
import type { SessionUser } from "@/server/auth/session";
import { decryptMessage } from "@/server/crypto/message";
import { db } from "@/server/db";
import { authorizeBoard, canBoard } from "@/server/policy/board";
import { toBoardActor } from "./conversation";

/**
 * 通報（T057 / FR-034, FR-027）。
 * メッセージの通報では、通報者が自分の会話から選んだメッセージだけを「提出物」として複製する。
 * 運営が読めるメッセージは、この提出物だけ（通信の秘密）。
 */
export async function createReport(
  actor: SessionUser,
  input: {
    targetType: ReportTargetType;
    targetId: string;
    reason: ReportReason;
    detail?: string;
    messageIds?: string[];
  },
) {
  authorizeBoard(toBoardActor(actor), "report.create");
  const detail = input.detail?.trim().slice(0, 2000) || null;

  // 対象が存在することを確かめる（存在しないものは受け付けない）
  let evidence: { messageId: string; sentAt: Date; senderRole: string; bodyPlain: string }[] = [];
  switch (input.targetType) {
    case "JOB_POST": {
      const job = await db.jobPost.findUnique({
        where: { id: input.targetId },
        select: { id: true },
      });
      if (!job) throw new DomainError("NOT_FOUND", "見つかりませんでした");
      break;
    }
    case "SEEKER_POST": {
      const post = await db.seekerPost.findUnique({
        where: { id: input.targetId },
        select: { id: true },
      });
      if (!post) throw new DomainError("NOT_FOUND", "見つかりませんでした");
      break;
    }
    case "USER": {
      const user = await db.user.findUnique({
        where: { id: input.targetId },
        select: { id: true },
      });
      if (!user) throw new DomainError("NOT_FOUND", "見つかりませんでした");
      break;
    }
    case "MESSAGE": {
      // targetId は会話の ID。通報者が当事者である会話のメッセージだけを選べる
      const conversation = await db.conversation.findUnique({ where: { id: input.targetId } });
      if (
        !conversation ||
        !canBoard(toBoardActor(actor), "conversation.access", {
          type: "conversation",
          seekerId: conversation.seekerId,
          employerId: conversation.employerId,
        })
      ) {
        throw new DomainError("NOT_FOUND", "見つかりませんでした");
      }
      const ids = [...new Set(input.messageIds ?? [])].slice(0, 20);
      if (ids.length === 0)
        throw new DomainError("VALIDATION", "通報するメッセージを1つ以上選んでください");
      const messages = await db.message.findMany({
        where: { id: { in: ids }, conversationId: conversation.id, kind: "USER" },
        orderBy: { createdAt: "asc" },
      });
      if (messages.length !== ids.length)
        throw new DomainError("VALIDATION", "選んだメッセージが見つかりません");
      evidence = messages.map((m) => ({
        messageId: m.id,
        sentAt: m.createdAt,
        senderRole: m.senderId === actor.userId ? "REPORTER" : "COUNTERPART",
        bodyPlain: m.bodyEncrypted ? decryptMessage(m.bodyEncrypted) : "",
      }));
      break;
    }
  }

  return db.$transaction(async (tx) => {
    const report = await tx.report.create({
      data: {
        reporterId: actor.userId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        detail,
        evidence: { create: evidence },
      },
    });
    await recordAudit(
      {
        type: "REPORT_CREATED",
        actorUserId: actor.userId,
        metadata: { itemCount: evidence.length },
      },
      tx,
    );
    return { reportId: report.id };
  });
}

/** 自分の通報の一覧（提出物は自分の通報だけ見られる） */
export async function listMyReports(actor: SessionUser) {
  return db.report.findMany({
    where: { reporterId: actor.userId },
    orderBy: { receivedAt: "desc" },
    take: 50,
    select: {
      id: true,
      targetType: true,
      reason: true,
      status: true,
      receivedAt: true,
      resolvedAt: true,
    },
  });
}
