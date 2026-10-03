/** Server Action・ドメイン処理の共通の戻り値（contracts/server-interfaces.md） */
export type ErrorCode =
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

export type Result<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: { code: ErrorCode; message: string; fieldErrors?: Record<string, string[]> };
    };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });

export const fail = (
  code: ErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>,
): Result<never> => ({ ok: false, error: { code, message, fieldErrors } });

/** ドメイン処理の中から投げて、action ラッパーで Result に変換する */
export class DomainError extends Error {
  constructor(
    readonly code: Exclude<ErrorCode, "INTERNAL">,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
