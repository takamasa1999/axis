import { expireJobs } from "@/server/domain/job-post";
import { logger } from "@/server/logger";

/** 掲載期限を過ぎた求人を掲載終了にする（T033 / FR-014、毎時） */
export async function handleJobExpiry() {
  const count = await expireJobs();
  if (count > 0) logger.info("jobs expired", { count });
}
