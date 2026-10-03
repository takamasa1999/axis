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
    AI_PROVIDER: z.enum(["mock", "anthropic", "bedrock"]).default("mock"),
    AI_MODEL_ID: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    AWS_REGION: z.string().default("ap-northeast-1"),
    MAIL_TRANSPORT: z.enum(["smtp", "ses"]).default("smtp"),
    SMTP_HOST: z.string().default("localhost"),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    MAIL_FROM: z.string().min(1),
  })
  .superRefine((env, ctx) => {
    if (env.AI_PROVIDER !== "mock" && !env.AI_MODEL_ID) {
      ctx.addIssue({
        code: "custom",
        path: ["AI_MODEL_ID"],
        message: "AI_PROVIDER が mock 以外のときは AI_MODEL_ID が必要です",
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
