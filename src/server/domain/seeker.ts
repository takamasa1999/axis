import "server-only";
import { z } from "zod";
import { JOB_CATEGORY_KEYS, PREFECTURES } from "@/lib/master-data";
import { DomainError } from "@/lib/result";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db";

/** 求職者のプロフィール（T043 / FR-021）。必須は表示名だけ */
export const SeekerProfileSchema = z.object({
  displayName: z.string().trim().min(1, "表示名を入れてください").max(30, "表示名は30文字までです"),
  desiredCategories: z
    .array(z.enum(JOB_CATEGORY_KEYS as unknown as [string, ...string[]]))
    .max(5)
    .default([]),
  desiredPrefectures: z.array(z.enum(PREFECTURES)).max(5).default([]),
  experience: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => v || null),
  qualifications: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => v || null),
  selfIntroduction: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => v || null),
});

export async function getSeekerProfile(userId: string) {
  return db.seekerProfile.findUnique({ where: { userId } });
}

export async function saveSeekerProfile(
  actor: SessionUser,
  input: z.output<typeof SeekerProfileSchema>,
) {
  if (actor.kind !== "PERSON") throw new DomainError("NOT_FOUND", "見つかりませんでした");
  return db.seekerProfile.upsert({
    where: { userId: actor.userId },
    update: input,
    create: { ...input, userId: actor.userId },
  });
}
