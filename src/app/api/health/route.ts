import { db } from "@/server/db";
import { logger } from "@/server/logger";

export const dynamic = "force-dynamic";

/** ALB のヘルスチェック用（T025）。DB に接続できれば 200 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch (error) {
    logger.error("health check failed", { error });
    return Response.json({ status: "error" }, { status: 503 });
  }
}
