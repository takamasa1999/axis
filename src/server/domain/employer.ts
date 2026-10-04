import "server-only";
import { z } from "zod";
import { PREFECTURES } from "@/lib/master-data";
import { DomainError } from "@/lib/result";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db";

/** 企業プロフィール（T026 / FR-008） */
export const EmployerProfileSchema = z.object({
  companyName: z.string().trim().min(1, "企業名・お店の名前を入れてください").max(100),
  prefecture: z.enum(PREFECTURES, "都道府県を選んでください"),
  address: z.string().trim().min(1, "所在地を入れてください").max(200),
  businessDescription: z.string().trim().min(1, "どんな会社・お店かを教えてください").max(2000),
  contactName: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((v) => v || null),
  websiteUrl: z
    .union([z.literal(""), z.url("URL の形式を確認してください")])
    .optional()
    .transform((v) => v || null),
  corporateNumber: z
    .union([z.literal(""), z.string().regex(/^\d{13}$/, "法人番号は13桁の数字です")])
    .optional()
    .transform((v) => v || null),
});
export type EmployerProfileInput = z.input<typeof EmployerProfileSchema>;

export async function getEmployerProfile(userId: string) {
  return db.employerProfile.findUnique({ where: { userId } });
}

export async function saveEmployerProfile(
  actor: SessionUser,
  input: z.output<typeof EmployerProfileSchema>,
) {
  if (actor.kind !== "EMPLOYER") throw new DomainError("NOT_FOUND", "見つかりませんでした");
  return db.employerProfile.upsert({
    where: { userId: actor.userId },
    update: input,
    create: { ...input, userId: actor.userId },
  });
}

/** 企業の公開ページ用（停止中・退会済みの企業は出さない） */
export async function getPublicEmployer(userId: string) {
  return db.employerProfile.findFirst({
    where: { userId, user: { deletedAt: null, suspendedAt: null, kind: "EMPLOYER" } },
  });
}
