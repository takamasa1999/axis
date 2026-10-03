import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink, twoFactor } from "better-auth/plugins";
import { env } from "@/lib/env";
import { db } from "@/server/db";
import { logger } from "@/server/logger";
import { magicLinkMail, sendMail } from "@/server/mail";

/**
 * 認証の設定（T016 / research R4）
 * - 本人（PERSON）: メールのマジックリンクのみ。アカウントは利用案内の受け入れ時にアプリ側で作る（自由な新規登録はできない）
 * - CA・管理者・運営（STAFF）: メール＋パスワード＋TOTP 二要素認証。アカウントは運営・管理者が作る
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
    disableSignUp: true,
    minPasswordLength: 12,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7日
    updateAge: 60 * 60 * 24, // 1日ごとに延長
  },
  plugins: [
    magicLink({
      disableSignUp: true,
      expiresIn: 60 * 15,
      storeToken: "hashed",
      sendMagicLink: async ({ email, url }) => {
        // STAFF は二要素認証を経ずにログインできないよう、マジックリンクを送らない
        const user = await db.user.findUnique({
          where: { email },
          select: { kind: true, deletedAt: true },
        });
        if (!user || user.kind !== "PERSON" || user.deletedAt) {
          logger.info("magic link skipped", { reason: "not an active person" });
          return;
        }
        await sendMail(magicLinkMail(email, url));
      },
    }),
    twoFactor({ issuer: "Axis" }),
    // Server Actions から Cookie を設定できるようにする（最後に置く）
    nextCookies(),
  ],
});

export type Auth = typeof auth;
