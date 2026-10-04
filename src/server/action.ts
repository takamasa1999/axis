import "server-only";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { DomainError, fail, ok, type Result } from "@/lib/result";
import { getSessionUser, type SessionUser } from "@/server/auth/session";
import { logger } from "@/server/logger";
import { NotFoundError } from "@/server/policy";

type ActionOptions = {
  /** false にするとログインなしで呼べる（利用案内の受け入れなど） */
  requireAuth?: boolean;
};

/**
 * Server Action を、入力の検証・ログイン確認・エラー変換つきで定義する（T022）。
 *
 * - 入力は Zod で検証し、失敗したら VALIDATION
 * - 権限がない（NotFoundError）は存在を明かさず NOT_FOUND
 * - 想定外のエラーは本文をログに出さずに INTERNAL
 */
export function defineAction<S extends z.ZodType, T>(
  schema: S,
  handler: (input: z.infer<S>, actor: SessionUser) => Promise<T>,
): (input: z.input<S>) => Promise<Result<T>>;
export function defineAction<S extends z.ZodType, T>(
  schema: S,
  handler: (input: z.infer<S>, actor: SessionUser | null) => Promise<T>,
  options: ActionOptions & { requireAuth: false },
): (input: z.input<S>) => Promise<Result<T>>;
export function defineAction<S extends z.ZodType, T>(
  schema: S,
  handler: (input: z.infer<S>, actor: SessionUser) => Promise<T>,
  options: ActionOptions = {},
) {
  const requireAuth = options.requireAuth ?? true;

  return async (raw: z.input<S>): Promise<Result<T>> => {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const flat = z.flattenError(parsed.error);
      return fail(
        "VALIDATION",
        "入力内容を確認してください",
        flat.fieldErrors as Record<string, string[]>,
      );
    }

    const actor = await getSessionUser();
    if (requireAuth && !actor) {
      return fail("UNAUTHENTICATED", "ログインしてください");
    }

    try {
      return ok(await handler(parsed.data, actor as SessionUser));
    } catch (error) {
      return toFailure(error);
    }
  };
}

export function toFailure(error: unknown): Result<never> {
  // redirect() / notFound() などの Next.js の制御用の例外はそのまま投げ直す
  unstable_rethrow(error);
  if (error instanceof NotFoundError) {
    return fail("NOT_FOUND", "見つかりませんでした");
  }
  if (error instanceof DomainError) {
    return fail(error.code, error.message, undefined, error.issues);
  }
  logger.error("action failed", { error });
  return fail("INTERNAL", "問題が発生しました。時間をおいてもう一度お試しください");
}
