import { getSessionUser } from "@/server/auth/session";
import { exportSeekerData } from "@/server/domain/export";

export const dynamic = "force-dynamic";

/** 求職者のデータの持ち出し（T065 / FR-045） */
export async function GET() {
  const actor = await getSessionUser();
  if (!actor || actor.kind !== "PERSON") return new Response("Not Found", { status: 404 });
  const data = await exportSeekerData(actor);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="axis-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
