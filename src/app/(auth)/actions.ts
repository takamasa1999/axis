"use server";

import { z } from "zod";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/common-passwords";
import { defineAction } from "@/server/action";
import { resendVerification, signUp } from "@/server/domain/account";

export const signUpAction = defineAction(
  z.object({
    kind: z.enum(["PERSON", "EMPLOYER"]),
    email: z.email("メールアドレスの形式を確認してください"),
    password: z
      .string()
      .min(PASSWORD_MIN, `パスワードは${PASSWORD_MIN}文字以上にしてください`)
      .max(PASSWORD_MAX),
    agreeTerms: z.literal(true, "利用規約とプライバシーポリシーへの同意が必要です"),
    confirmAge: z.boolean().optional(),
    next: z.string().max(500).optional(),
  }),
  async (input) => signUp(input),
  { requireAuth: false },
);

export const resendVerificationAction = defineAction(
  z.object({ email: z.email(), next: z.string().max(500).optional() }),
  async (input) => {
    await resendVerification(input.email, input.next);
  },
  { requireAuth: false },
);
