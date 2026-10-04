import { z } from "zod";

/**
 * 環境変数を検証して型付きで読み出す（T006）。
 * 不足や不正があれば、最初に読んだ時点でエラーにする。
 */
const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_URL: z.url(),
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    AI_PROVIDER: z.enum(["mock", "openrouter", "anthropic", "bedrock"]).default("mock"),
    AI_MODEL_ID: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    OPENROUTER_API_KEY: z.string().optional(),
    AWS_REGION: z.string().default("ap-northeast-1"),
    MAIL_TRANSPORT: z.enum(["smtp", "ses"]).default("smtp"),
    SMTP_HOST: z.string().default("localhost"),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    MAIL_FROM: z.string().min(1),
    /**
     * メッセージ本文の暗号化の鍵（research R6）。「世代:base64(32バイト)」をカンマ区切りで並べ、先頭を新しい暗号化に使う。
     * 例: v2:xxxx,v1:yyyy（v1 で暗号化した古いメッセージも復号できる）
     */
    MESSAGE_ENCRYPTION_KEY: z
      .string()
      .regex(
        /^[a-z0-9]+:[A-Za-z0-9+/=]{43,44}(,[a-z0-9]+:[A-Za-z0-9+/=]{43,44})*$/,
        "世代:base64(32バイト) の形式で指定してください",
      ),
    /** 001 の紹介会社向けの画面（/agency, /invite）を有効にする */
    ENABLE_AGENCY_PILOT: z.stringbool().default(false),
    /** 利用規約の版（登録時の同意の記録に使う） */
    TERMS_VERSION: z.string().default("2026-10-draft"),
  })
  .superRefine((env, ctx) => {
    if (env.AI_PROVIDER !== "mock" && !env.AI_MODEL_ID) {
      ctx.addIssue({
        code: "custom",
        path: ["AI_MODEL_ID"],
        message: "AI_PROVIDER が mock 以外のときは AI_MODEL_ID が必要です",
      });
    }
    if (env.AI_PROVIDER === "openrouter" && !env.OPENROUTER_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["OPENROUTER_API_KEY"],
        message: "AI_PROVIDER=openrouter のときは OPENROUTER_API_KEY が必要です",
      });
    }
    if (env.AI_PROVIDER === "anthropic" && !env.ANTHROPIC_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["ANTHROPIC_API_KEY"],
        message: "AI_PROVIDER=anthropic のときは ANTHROPIC_API_KEY が必要です",
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `環境変数が不正です:\n${z.prettifyError(parsed.error)}\n.env.example を参考に .env.local を設定してください。`,
      );
    }
    cached = parsed.data;
  }
  return cached;
}
