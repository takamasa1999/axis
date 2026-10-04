import "server-only";
import { DomainError } from "@/lib/result";
import { OPENING_QUESTION } from "@/server/ai/prompts/dialogue";
import { axisAi } from "@/server/ai/provider";
import { SAFETY_MESSAGE } from "@/server/ai/safety";
import type { AxisTurn } from "@/server/ai/schemas";
import type { PastRecord, TranscriptMessage } from "@/server/ai/types";
import { recordAudit } from "@/server/audit";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { authorize, NotFoundError } from "@/server/policy";
import { getOwnedMilestone } from "./milestone";

/** 30分操作がなければ中断（PAUSED）として扱う（data-model.md の状態遷移） */
const IDLE_MS = 30 * 60 * 1000;

async function getOwnedSession(actor: SessionUser, sessionId: string) {
  const session = await db.dialogueSession.findUnique({
    where: { id: sessionId },
    include: { milestone: { select: { id: true, axisId: true } } },
  });
  if (!session) throw new NotFoundError();
  authorize(actor, "axis.readWrite", { type: "axis", axisId: session.milestone.axisId });
  return session;
}

/** 節目の最新の対話の状態（画面表示用） */
export async function getDialogueState(actor: SessionUser, milestoneId: string) {
  const milestone = await getOwnedMilestone(actor, milestoneId);
  let session = await db.dialogueSession.findFirst({
    where: { milestoneId },
    orderBy: [{ startedAt: { sort: "desc", nulls: "first" } }],
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (
    session?.status === "IN_PROGRESS" &&
    session.lastActiveAt &&
    Date.now() - session.lastActiveAt.getTime() > IDLE_MS
  ) {
    session = await db.dialogueSession.update({
      where: { id: session.id },
      data: { status: "PAUSED" },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }
  return { milestone, session };
}

/**
 * 対話を始める（または再開する）（FR-006）。
 * 中断中・進行中のセッションがあればそれを返す。完了・安全停止のあとは新しいセッションを作る。
 */
export async function startDialogue(actor: SessionUser, milestoneId: string) {
  const milestone = await getOwnedMilestone(actor, milestoneId);
  const now = new Date();

  const open = await db.dialogueSession.findFirst({
    where: { milestoneId, status: { in: ["NOT_STARTED", "IN_PROGRESS", "PAUSED"] } },
    orderBy: { startedAt: "desc" },
  });
  if (open && open.status !== "NOT_STARTED") {
    return db.dialogueSession.update({
      where: { id: open.id },
      data: { status: "IN_PROGRESS", lastActiveAt: now },
    });
  }

  const pastRecords = await loadPastRecords(milestone.axisId, milestone.id);
  const opening =
    pastRecords.length > 0
      ? "おかえりなさい。前回の節目で考えたことも手がかりにしながら、いまのあなたの状況を一緒に整理していきましょう。最初に、いま気になっていることを教えてください。"
      : OPENING_QUESTION;

  const session = await db.$transaction(async (tx) => {
    const s = open
      ? await tx.dialogueSession.update({
          where: { id: open.id },
          data: { status: "IN_PROGRESS", startedAt: now, lastActiveAt: now },
        })
      : await tx.dialogueSession.create({
          data: { milestoneId, status: "IN_PROGRESS", startedAt: now, lastActiveAt: now },
        });
    await tx.dialogueMessage.create({
      data: { sessionId: s.id, role: "AXIS", kind: "INTRO", content: opening },
    });
    await recordAudit(
      {
        type: "SESSION_STARTED",
        actorUserId: actor.userId,
        axisId: milestone.axisId,
        metadata: { sessionId: s.id, milestoneId },
      },
      tx,
    );
    return s;
  });
  return session;
}

/** 本人自身の、ほかの節目の記録（FR-014）。ほかの本人の情報は決して含めない */
async function loadPastRecords(axisId: string, excludeMilestoneId: string): Promise<PastRecord[]> {
  const entries = await db.recordEntry.findMany({
    where: {
      milestone: { axisId, id: { not: excludeMilestoneId } },
      type: { in: ["VALUES", "CRITERIA_VISION", "REASON"] },
    },
    orderBy: { recordedAt: "desc" },
    take: 12,
  });
  return entries.map((e) => ({
    type: e.type as PastRecord["type"],
    content: e.content,
    recordedAt: e.recordedAt,
  }));
}

export type TurnResult =
  | { kind: "SAFETY"; text: string }
  | { kind: "QUESTION" | "MATERIAL"; text: string; turn: AxisTurn };

/**
 * 本人の発言を受け取り、Axis の応答を作る（FR-004, FR-009）。
 * 危険な兆候があれば、AI の応答の代わりに固定の案内文を返し、対話を止める。
 */
export async function postMessage(
  actor: SessionUser,
  sessionId: string,
  content: string,
  onTextDelta?: (delta: string) => void,
): Promise<TurnResult> {
  const session = await getOwnedSession(actor, sessionId);
  if (session.status !== "IN_PROGRESS" && session.status !== "PAUSED") {
    throw new DomainError("CONFLICT", "この対話はすでに終わっています");
  }
  const axisId = session.milestone.axisId;

  await db.$transaction([
    db.dialogueMessage.create({ data: { sessionId, role: "PERSON", kind: "ANSWER", content } }),
    db.dialogueSession.update({
      where: { id: sessionId },
      data: { status: "IN_PROGRESS", lastActiveAt: new Date() },
    }),
  ]);

  const ai = axisAi();
  const safety = await ai.assessSafety(content);
  if (safety.concerning) {
    await db.$transaction(async (tx) => {
      await tx.dialogueMessage.create({
        data: { sessionId, role: "AXIS", kind: "SAFETY", content: SAFETY_MESSAGE },
      });
      await tx.dialogueSession.update({
        where: { id: sessionId },
        data: { status: "SAFETY_STOPPED", safetyStoppedAt: new Date() },
      });
      await recordAudit(
        {
          type: "SESSION_SAFETY_STOPPED",
          actorUserId: actor.userId,
          axisId,
          metadata: { sessionId },
        },
        tx,
      );
    });
    return { kind: "SAFETY", text: SAFETY_MESSAGE };
  }

  const messages = await db.dialogueMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  const transcript: TranscriptMessage[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  const pastRecords = await loadPastRecords(axisId, session.milestone.id);

  const turn = await ai.nextTurn({ transcript, pastRecords }, onTextDelta);
  const kind = turn.kind === "MATERIAL" ? "MATERIAL" : "QUESTION";
  await db.dialogueMessage.create({
    data: { sessionId, role: "AXIS", kind, content: turn.text },
  });
  return { kind, text: turn.text, turn };
}

/**
 * 対話を終えて整理結果（v1）を作る（FR-007, FR-023）。
 * AI が作った内容は「下書き」で、本人が確認・修正するまで共有の候補にはならない（共有は本人の許可が必要）。
 */
export async function completeDialogue(actor: SessionUser, sessionId: string) {
  const session = await getOwnedSession(actor, sessionId);
  if (session.status !== "IN_PROGRESS" && session.status !== "PAUSED") {
    throw new DomainError("CONFLICT", "この対話はすでに終わっています");
  }
  const messages = await db.dialogueMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  if (!messages.some((m) => m.role === "PERSON")) {
    throw new DomainError("VALIDATION", "まだ何も話していません");
  }

  const draft = await axisAi().draftReflection(
    messages.map((m) => ({ role: m.role, content: m.content })),
  );
  const now = new Date();

  return db.$transaction(async (tx) => {
    const summary = await tx.reflectionSummary.create({ data: { sessionId } });
    const version = await tx.reflectionVersion.create({
      data: {
        summaryId: summary.id,
        versionNo: 1,
        createdBy: "AI",
        sections: {
          create: draft.sections.map((s) => ({
            aspect: s.aspect,
            content: s.content,
            isSensitive: s.sensitiveHint,
          })),
        },
      },
    });
    await tx.reflectionSummary.update({
      where: { id: summary.id },
      data: { currentVersionId: version.id },
    });
    if (draft.recordEntries.length > 0) {
      await tx.recordEntry.createMany({
        data: draft.recordEntries.map((e) => ({
          milestoneId: session.milestone.id,
          type: e.type,
          content: e.content,
          source: "DIALOGUE" as const,
          sourceSessionId: sessionId,
        })),
      });
    }
    await tx.dialogueSession.update({
      where: { id: sessionId },
      data: { status: "COMPLETED", completedAt: now },
    });
    await recordAudit(
      {
        type: "SESSION_COMPLETED",
        actorUserId: actor.userId,
        axisId: session.milestone.axisId,
        metadata: {
          sessionId,
          durationSeconds: session.startedAt
            ? Math.round((now.getTime() - session.startedAt.getTime()) / 1000)
            : undefined,
        },
      },
      tx,
    );
    return { summaryId: summary.id, versionId: version.id };
  });
}
