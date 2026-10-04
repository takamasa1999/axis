import { getSessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { getSnapshotForAgency, snapshotToCsv } from "@/server/domain/snapshot";
import { NotFoundError } from "@/server/policy";

/** 許可済み要約の CSV（T061 / contracts/server-interfaces.md）。条件を満たさなければ 404 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/agency/relationships/[relationshipId]/snapshot.csv">,
) {
  const actor = await getSessionUser();
  if (!actor || actor.kind !== "STAFF") return new Response("Not Found", { status: 404 });
  const { relationshipId } = await ctx.params;

  try {
    const { snapshot } = await getSnapshotForAgency(actor, relationshipId, "export");
    if (!snapshot) return new Response("Not Found", { status: 404 });
    const rel = await db.agencyRelationship.findUniqueOrThrow({
      where: { id: relationshipId },
      select: { agency: { select: { name: true } } },
    });
    return new Response(snapshotToCsv(relationshipId, rel.agency.name, snapshot), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="axis-${relationshipId}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) return new Response("Not Found", { status: 404 });
    throw error;
  }
}
