/** Server Action・ドメイン処理の共通の戻り値（contracts/server-interfaces.md） */
export type ErrorCode =
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "EMAIL_NOT_VERIFIED"
  | "SUSPENDED"
  | "BLOCKED"
  | "INTERNAL";

export type Result<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: ErrorCode;
        message: string;
        fieldErrors?: Record<string, string[]>;
        /** 掲載ルールなどで見つかった問題の一覧（項目と直し方） */
        issues?: { field: string; message: string }[];
      };
    };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });

export const fail = (
  code: ErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>,
  issues?: { field: string; message: string }[],
): Result<never> => ({ ok: false, error: { code, message, fieldErrors, issues } });

/** ドメイン処理の中から投げて、action ラッパーで Result に変換する */
export class DomainError extends Error {
  issues?: { field: string; message: string }[];
  constructor(
    readonly code: Exclude<ErrorCode, "INTERNAL">,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
