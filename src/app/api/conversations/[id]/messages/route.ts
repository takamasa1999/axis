import { getSessionUser } from "@/server/auth/session";
import { getMessagesAfter } from "@/server/domain/conversation";
import { logger } from "@/server/logger";
import { NotFoundError } from "@/server/policy";

export const dynamic = "force-dynamic";

/**
 * メッセージの差分取得（T048）。会話の当事者だけ。画面は3秒ごと（非表示のときは30秒ごと）に呼ぶ。
 * 本文は復号して返すが、ログには出さない。
 */
export async function GET(request: Request, ctx: RouteContext<"/api/conversations/[id]/messages">) {
  const actor = await getSessionUser();
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { id } = await ctx.params;
  const after = new URL(request.url).searchParams.get("after") ?? undefined;
  try {
    const result = await getMessagesAfter(
      actor,
      id,
      after && /^[0-9a-f-]{36}$/i.test(after) ? after : undefined,
    );
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof NotFoundError)
      return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    logger.error("message polling failed", { error });
    return Response.json({ error: "INTERNAL" }, { status: 500 });
  }
}
