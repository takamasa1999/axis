/**
 * 本文をログに出さないロガー（T023 / research R11）。
 * 対話の本文やメールアドレスなどが入りうるキーは、値を伏せて出力する。
 */
const REDACTED_KEYS = new Set([
  "content",
  "text",
  "message",
  "messages",
  "body",
  "prompt",
  "reason",
  "email",
  "label",
  "notes",
  "notesByCriteria",
  "password",
  "token",
]);

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[depth]";
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value instanceof Error) {
    // エラーメッセージに本文が含まれることがあるため、名前とスタックの1行目だけを残す
    return { name: value.name, at: value.stack?.split("\n")[1]?.trim() };
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        REDACTED_KEYS.has(k) ? "[redacted]" : redact(v, depth + 1),
      ]),
    );
  }
  return value;
}

function write(level: Level, msg: string, fields?: Fields) {
  if (level === "debug" && process.env.NODE_ENV === "production") return;
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    msg,
    ...(fields ? (redact(fields) as Fields) : {}),
  });
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, fields?: Fields) => write("debug", msg, fields),
  info: (msg: string, fields?: Fields) => write("info", msg, fields),
  warn: (msg: string, fields?: Fields) => write("warn", msg, fields),
  error: (msg: string, fields?: Fields) => write("error", msg, fields),
};
