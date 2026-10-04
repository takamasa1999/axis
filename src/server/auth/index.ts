import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { isWeakPassword, PASSWORD_MAX, PASSWORD_MIN } from "@/lib/common-passwords";
import { env } from "@/lib/env";
import { recordAudit } from "@/server/audit";
import { db } from "@/server/db";
import { logger } from "@/server/logger";
import { lockedMail, passwordResetMail, sendMail, verificationMail } from "@/server/mail";

/** 連続して何回失敗したらロックするか（FR-004） */
export const LOCK_THRESHOLD = 10;
const LOCK_MINUTES = 15;

/**
 * 認証の設定（002 / research R1）
 * - ログインはメールアドレス＋パスワードのみ（求職者・企業・運営すべて）
 * - 確認メールのリンクを開くまでログインできない（閲覧はログイン不要）
 * - 連続して10回失敗すると15分ロックし、本人にメールで知らせる
 * - 多要素認証は将来の追加機能（twoFactor プラグインを足せる構成。two_factors テーブルは残している）
 * - 新規登録は Server Action（src/server/domain/account.ts）から呼び、種類（求職者／企業）をアプリ側で決める
 */
export const auth = betterAuth({
  appName: "Axis",
  baseURL: env().APP_URL,
  secret: env().BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),
  advanced: {
    // ID は Prisma 側の @default(uuid(7)) で作る
    database: { generateId: false },
  },
  user: {
    additionalFields: {
      kind: { type: "string", required: false, input: false, defaultValue: "PERSON" },
      isOperator: { type: "boolean", required: false, input: false, defaultValue: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: PASSWORD_MIN,
    maxPasswordLength: PASSWORD_MAX,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendMail(passwordResetMail(user.email, url));
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail(verificationMail(user.email, url));
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30日
    updateAge: 60 * 60 * 24,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const body = (ctx.body ?? {}) as { email?: string; password?: string; newPassword?: string };

      // 新規登録は Server Action（signUp）からだけ受け付ける。HTTP から直接の登録は拒否する
      if (ctx.path === "/sign-up/email" && ctx.request) {
        throw new APIError("FORBIDDEN", { message: "登録は登録画面から行ってください" });
      }
      // 推測しやすいパスワードを拒否する（FR-003）。登録・再設定・変更のすべてで確認する
      const candidate =
        ctx.path === "/sign-up/email"
          ? body.password
          : ctx.path === "/reset-password" || ctx.path === "/change-password"
            ? body.newPassword
            : undefined;
      if (candidate && isWeakPassword(candidate, body.email)) {
        throw new APIError("BAD_REQUEST", {
          code: "WEAK_PASSWORD",
          message: "推測されやすいパスワードです。別のパスワードにしてください",
        });
      }

      if (ctx.path !== "/sign-in/email") return;
      const email = String(body.email ?? "").toLowerCase();
      const user = await db.user.findUnique({ where: { email }, select: { lockedUntil: true } });
      if (user?.lockedUntil && user.lockedUntil > new Date()) {
        throw new APIError("TOO_MANY_REQUESTS", {
          message:
            "ログインの失敗が続いたため、しばらくログインできません。時間をおいてお試しください",
        });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return;
      const email = String((ctx.body as { email?: string } | undefined)?.email ?? "").toLowerCase();
      if (!email) return;
      const returned = ctx.context.returned;
      const failed = isAPIError(returned) && returned.statusCode === 401;
      if (failed) await recordLoginFailure(email);
      else if (!isAPIError(returned))
        await db.user.updateMany({ where: { email }, data: { failedLoginCount: 0 } });
    }),
  },
  plugins: [
    // Server Actions から Cookie を設定できるようにする（最後に置く）
    nextCookies(),
  ],
});

async function recordLoginFailure(email: string) {
  const user = await db.user
    .update({
      where: { email },
      data: { failedLoginCount: { increment: 1 } },
      select: { id: true, failedLoginCount: true },
    })
    .catch(() => null); // 登録されていないメールアドレスは何もしない
  if (!user || user.failedLoginCount < LOCK_THRESHOLD) return;

  const lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
  await db.user.update({ where: { id: user.id }, data: { lockedUntil, failedLoginCount: 0 } });
  await recordAudit({ type: "ACCOUNT_LOCKED", actorUserId: user.id });
  await sendMail(lockedMail(email, LOCK_MINUTES)).catch((error) =>
    logger.error("lock notice failed", { error }),
  );
}

export type Auth = typeof auth;
