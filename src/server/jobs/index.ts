import "server-only";
import { PgBoss } from "pg-boss";
import { env } from "@/lib/env";
import { logger } from "@/server/logger";

/**
 * バックグラウンド処理（T022 / research R3）。PostgreSQL をキューとして使う pg-boss で動かす。
 * ECS のタスクが複数あっても、同じジョブが二重に実行されない。
 */
export const QUEUES = {
  messageDigest: "message-digest",
  jobExpiry: "job-expiry",
  jobAlert: "job-alert",
  jobChangeNotice: "job-change-notice",
  reportSla: "report-sla",
} as const;
type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

const g = globalThis as unknown as { boss?: Promise<PgBoss> };

function jobsEnabled() {
  return process.env.NODE_ENV !== "test" && process.env.JOBS_DISABLED !== "true";
}

async function boss(): Promise<PgBoss> {
  g.boss ??= (async () => {
    const instance = new PgBoss({ connectionString: env().DATABASE_URL, schema: "pgboss" });
    instance.on("error", (error) => logger.error("pg-boss error", { error }));
    await instance.start();
    for (const name of Object.values(QUEUES)) await instance.createQueue(name);
    return instance;
  })();
  return g.boss;
}

/**
 * ジョブを予約する。テスト中・無効化中は何もしない（ドメインの処理はジョブに頼らず完結させる）。
 * 失敗してもユーザーの操作は止めない（通知が遅れるだけ）。
 */
export async function enqueue(
  name: QueueName,
  data: object,
  options: { startAfterSeconds?: number; singletonKey?: string; singletonSeconds?: number } = {},
) {
  if (!jobsEnabled()) return;
  try {
    await (await boss()).send(name, data, {
      startAfter: options.startAfterSeconds,
      singletonKey: options.singletonKey,
      singletonSeconds: options.singletonSeconds,
    });
  } catch (error) {
    logger.error("enqueue failed", { error, queue: name });
  }
}

/** サーバー起動時にワーカーと定期実行を登録する（src/instrumentation.ts から呼ぶ） */
export async function startWorkers() {
  if (!jobsEnabled()) return;
  const b = await boss();
  const { handleMessageDigest } = await import("./message-digest");
  const { handleJobExpiry } = await import("./job-expiry");
  const { handleJobAlert } = await import("./job-alert");
  const { handleJobChangeNotice } = await import("./job-change-notice");
  const { handleReportSla } = await import("./report-sla");

  const run =
    <T>(name: string, fn: (data: T) => Promise<void>) =>
    async (jobs: { data: T }[]) => {
      for (const job of jobs) {
        try {
          await fn(job.data);
        } catch (error) {
          logger.error("job failed", { error, queue: name });
          throw error;
        }
      }
    };

  await b.work(QUEUES.messageDigest, run(QUEUES.messageDigest, handleMessageDigest));
  await b.work(QUEUES.jobExpiry, run(QUEUES.jobExpiry, handleJobExpiry));
  await b.work(QUEUES.jobAlert, run(QUEUES.jobAlert, handleJobAlert));
  await b.work(QUEUES.jobChangeNotice, run(QUEUES.jobChangeNotice, handleJobChangeNotice));
  await b.work(QUEUES.reportSla, run(QUEUES.reportSla, handleReportSla));

  await b.schedule(QUEUES.jobExpiry, "5 * * * *", {}, { tz: "Asia/Tokyo" });
  await b.schedule(QUEUES.jobAlert, "0 8 * * *", {}, { tz: "Asia/Tokyo" });
  await b.schedule(QUEUES.reportSla, "0 9 * * 1-5", {}, { tz: "Asia/Tokyo" });
  logger.info("background workers started");
}
