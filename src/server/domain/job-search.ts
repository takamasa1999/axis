import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { EMPLOYMENT_TYPE_KEYS, JOB_CATEGORY_KEYS, PREFECTURES } from "@/lib/master-data";
import { db } from "@/server/db";

/**
 * 求人の検索（T035 / FR-017〜FR-019）。
 * 並び順は、画面に名前で示した客観的な基準（新着順・給与の高い順）だけ。運営の判断で選んだ並びはない（原則VII）。
 */
export const PAGE_SIZE = 20;

export const SORTS = {
  NEWEST: "新着順",
  SALARY_DESC: "給与の高い順",
} as const;

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .optional()
    .transform((v) =>
      v && (values as readonly string[]).includes(v) ? (v as T[number]) : undefined,
    );

export const SearchParamsSchema = z.object({
  q: z
    .string()
    .optional()
    .transform((v) => v?.trim().slice(0, 50) || undefined),
  category: optionalEnum(JOB_CATEGORY_KEYS as unknown as [string, ...string[]]),
  prefecture: optionalEnum(PREFECTURES),
  type: optionalEnum(EMPLOYMENT_TYPE_KEYS as unknown as [string, ...string[]]),
  salaryType: optionalEnum(["HOURLY", "DAILY", "MONTHLY", "ANNUAL"] as const),
  salaryMin: z.coerce.number().int().positive().max(100_000_000).optional().catch(undefined),
  sort: optionalEnum(["NEWEST", "SALARY_DESC"] as const),
  page: z.coerce.number().int().min(1).max(500).optional().catch(undefined),
});
export type SearchParams = z.output<typeof SearchParamsSchema>;

/** URL の検索条件を読む（不正な値は無視する） */
export function parseSearchParams(
  raw: Record<string, string | string[] | undefined>,
): SearchParams {
  const flat = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  return SearchParamsSchema.parse(flat);
}

/** 公開中で期限内、企業が停止・退会していない求人 */
export function openJobWhere(now = new Date()): Prisma.JobPostWhereInput {
  return {
    status: "PUBLISHED",
    expiresAt: { gt: now },
    employer: { deletedAt: null, suspendedAt: null },
  };
}

export function searchWhere(p: SearchParams, now = new Date()): Prisma.JobPostWhereInput {
  const and: Prisma.JobPostWhereInput[] = [openJobWhere(now)];
  if (p.category) and.push({ category: p.category });
  if (p.prefecture) and.push({ prefecture: p.prefecture });
  if (p.type) and.push({ employmentType: p.type as "FULL_TIME" });
  if (p.salaryType) {
    and.push({ salaryType: p.salaryType });
    if (p.salaryMin)
      and.push({ OR: [{ salaryMax: { gte: p.salaryMin } }, { salaryMin: { gte: p.salaryMin } }] });
  }
  if (p.q) {
    and.push({
      OR: [
        { title: { contains: p.q, mode: "insensitive" } },
        { jobDescription: { contains: p.q, mode: "insensitive" } },
        { employer: { employerProfile: { companyName: { contains: p.q, mode: "insensitive" } } } },
      ],
    });
  }
  return { AND: and };
}

/** 給与の高い順は、給与の種類を選んだときだけ使える（種類がちがう金額は比べられないため） */
export function effectiveSort(p: SearchParams): keyof typeof SORTS {
  return p.sort === "SALARY_DESC" && p.salaryType ? "SALARY_DESC" : "NEWEST";
}

export async function searchJobs(p: SearchParams) {
  const page = p.page ?? 1;
  const sort = effectiveSort(p);
  const where = searchWhere(p);
  const orderBy: Prisma.JobPostOrderByWithRelationInput[] =
    sort === "SALARY_DESC"
      ? [
          { salaryMax: { sort: "desc", nulls: "last" } },
          { salaryMin: "desc" },
          { publishedAt: "desc" },
        ]
      : [{ publishedAt: "desc" }, { id: "desc" }];
  const [total, jobs] = await Promise.all([
    db.jobPost.count({ where }),
    db.jobPost.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { employer: { select: { employerProfile: { select: { companyName: true } } } } },
    }),
  ]);
  return { total, jobs, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), sort };
}

export type JobCardData = Awaited<ReturnType<typeof searchJobs>>["jobs"][number];

/** 新着の求人（トップページ） */
export async function latestJobs(take = 6) {
  return db.jobPost.findMany({
    where: openJobWhere(),
    orderBy: { publishedAt: "desc" },
    take,
    include: { employer: { select: { employerProfile: { select: { companyName: true } } } } },
  });
}
