import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { db } from "@/server/db";
import { openJobWhere } from "@/server/domain/job-search";

export const dynamic = "force-dynamic";

/** サイトマップ（research R8）。公開中の求人と企業ページだけを載せる */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env().APP_URL;
  const jobs = await db.jobPost.findMany({
    where: openJobWhere(),
    select: { id: true, employerId: true, contentUpdatedAt: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
    take: 5000,
  });
  const employers = [...new Set(jobs.map((j) => j.employerId))];
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/jobs`, changeFrequency: "hourly", priority: 0.9 },
    ...jobs.map((j) => ({
      url: `${base}/jobs/${j.id}`,
      lastModified: j.contentUpdatedAt ?? j.publishedAt ?? undefined,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...employers.map((id) => ({
      url: `${base}/companies/${id}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
