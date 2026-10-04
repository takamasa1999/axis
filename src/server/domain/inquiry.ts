import "server-only";
import type { InquiryCategory, InquiryStatus } from "@/generated/prisma/enums";
import { DomainError } from "@/lib/result";
import { recordAudit } from "@/server/audit";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { authorizeBoard } from "@/server/policy/board";
import { assertWithinLimit } from "@/server/rate-limit-db";
import { toBoardActor } from "./conversation";

/** お問い合わせ（苦情・相談）の窓口（T058 / FR-036、指針 第六の二(一)）。ログインしていなくても送れる */
export async function createInquiry(
  actor: SessionUser | null,
  input: { email: string; category: InquiryCategory; body: string },
) {
  const email = input.email.trim().toLowerCase();
  await assertWithinLimit("inquiry", email, actor?.userId);
  const inquiry = await db.inquiry.create({
    data: {
      email,
      category: input.category,
      body: input.body.trim(),
      userId: actor?.userId ?? null,
    },
  });
  await recordAudit({ type: "INQUIRY_CREATED", actorUserId: actor?.userId ?? null });
  return { inquiryId: inquiry.id };
}

export async function listInquiries(op: SessionUser, status?: InquiryStatus) {
  authorizeBoard(toBoardActor(op), "moderation.handle");
  return db.inquiry.findMany({
    where: status ? { status } : { status: { in: ["OPEN", "IN_PROGRESS"] } },
    orderBy: { receivedAt: "asc" },
    take: 200,
  });
}

type Note = { at: string; operatorId: string; status: InquiryStatus; note: string };

/** 対応の経過を追記する（受付から対応完了までを記録） */
export async function updateInquiry(
  op: SessionUser,
  input: { inquiryId: string; status: InquiryStatus; note: string },
) {
  authorizeBoard(toBoardActor(op), "moderation.handle");
  const inquiry = await db.inquiry.findUnique({ where: { id: input.inquiryId } });
  if (!inquiry) throw new DomainError("NOT_FOUND", "見つかりませんでした");
  const now = new Date();
  const notes = [
    ...((inquiry.notes as Note[]) ?? []),
    { at: now.toISOString(), operatorId: op.userId, status: input.status, note: input.note },
  ];
  await db.inquiry.update({
    where: { id: inquiry.id },
    data: {
      status: input.status,
      notes,
      firstHandledAt: inquiry.firstHandledAt ?? now,
      closedAt: input.status === "CLOSED" ? now : null,
    },
  });
}
