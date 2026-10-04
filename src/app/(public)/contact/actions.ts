"use server";

import { z } from "zod";
import { defineAction } from "@/server/action";
import { createInquiry } from "@/server/domain/inquiry";

export const sendInquiryAction = defineAction(
  z.object({
    email: z.email("メールアドレスの形式を確認してください"),
    category: z.enum(["COMPLAINT", "QUESTION", "OTHER"]),
    body: z.string().trim().min(1, "内容を書いてください").max(5000),
  }),
  async (input, actor) => createInquiry(actor, input),
  { requireAuth: false },
);
