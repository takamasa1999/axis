import { z } from "zod";
import { DomainError } from "@/lib/result";
import { getSessionUser } from "@/server/auth/session";
import { postMessage } from "@/server/domain/dialogue";
import { logger } from "@/server/logger";
import { NotFoundError } from "@/server/policy";
import { checkRateLimit } from "@/server/rate-limit";

const Body = z.object({ content: z.string().trim().min(1).max(4000) });

/**
 * 対話（ストリーミング）（T040 / contracts/server-interfaces.md）
 * 応答は NDJSON（1行1イベント）で返す：
 *   {"type":"delta","text":"..."}            … 本人に表示する文の差分
 *   {"type":"reset"}                          … 作り直しのため、それまでの表示を消す
 *   {"type":"done","kind":"QUESTION"|"MATERIAL"|"SAFETY","text":"...","readyToSummarize":bool}
 *   {"type":"error","message":"..."}
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/dialogue/[sessionId]/messages">,
) {
  const actor = await getSessionUser();
  if (!actor || actor.kind !== "PERSON") {
    return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION" }, { status: 400 });
  }
  const limit = checkRateLimit("dialogueMessage", actor.userId);
  if (!limit.allowed) {
    return Response.json(
      { error: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } },
    );
  }

  const { sessionId } = await ctx.params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      let streamed = "";
      try {
        const result = await postMessage(actor, sessionId, parsed.data.content, (delta) => {
          streamed += delta;
          send({ type: "delta", text: delta });
        });
        if (streamed !== result.text) send({ type: "reset" });
        send({
          type: "done",
          kind: result.kind,
          text: result.text,
          readyToSummarize: result.kind === "SAFETY" ? false : result.turn.readyToSummarize,
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          send({ type: "error", message: "見つかりませんでした" });
        } else if (error instanceof DomainError) {
          send({ type: "error", message: error.message });
        } else {
          logger.error("dialogue turn failed", { error });
          send({
            type: "error",
            message: "うまく応答できませんでした。もう一度お話しいただけますか",
          });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
