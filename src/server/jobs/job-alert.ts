import { env } from "@/lib/env";
import { db } from "@/server/db";
import { type SearchParams, SearchParamsSchema, searchWhere } from "@/server/domain/job-search";
import { logger } from "@/server/logger";
import { jobAlertMail, sendMail } from "@/server/mail";

/**
 * 保存した検索条件に合う新着求人のメール通知（T055 / FR-020、毎朝8時）。
 * 通知の内容は、本人が保存した条件だけで決まる（運営の判断で選んだ求人は送らない。原則VII）。
 */
export async function handleJobAlert() {
  const searches = await db.savedSearch.findMany({
    where: { notify: true, seeker: { notifyJobAlerts: true, deletedAt: null, suspendedAt: null } },
    include: { seeker: { select: { email: true } } },
  });
  for (const s of searches) {
    const criteria = SearchParamsSchema.parse(s.criteria ?? {}) as SearchParams;
    const since = s.lastNotifiedAt ?? s.createdAt;
    const count = await db.jobPost.count({
      where: { AND: [searchWhere(criteria), { publishedAt: { gt: since } }] },
    });
    if (count > 0) {
      const query = new URLSearchParams(
        Object.entries(criteria)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)]),
      );
      await sendMail(jobAlertMail(s.seeker.email, `${env().APP_URL}/jobs?${query}`, count)).catch(
        (error) => logger.error("job alert mail failed", { error }),
      );
    }
    await db.savedSearch.update({ where: { id: s.id }, data: { lastNotifiedAt: new Date() } });
  }
}
