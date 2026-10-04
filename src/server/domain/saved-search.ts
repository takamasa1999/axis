import "server-only";
import { DomainError } from "@/lib/result";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { type SearchParams, SearchParamsSchema } from "./job-search";

/** 保存した検索条件（T055 / FR-020）。新着通知は本人が保存した条件だけで作る */
const MAX = 10;

export async function saveSearch(actor: SessionUser, criteria: SearchParams) {
  if (actor.kind !== "PERSON") throw new DomainError("NOT_FOUND", "見つかりませんでした");
  const clean = Object.fromEntries(
    Object.entries(SearchParamsSchema.parse(criteria)).filter(
      ([k, v]) => v !== undefined && k !== "page" && k !== "sort",
    ),
  );
  if ((await db.savedSearch.count({ where: { seekerId: actor.userId } })) >= MAX) {
    throw new DomainError("CONFLICT", `保存できる条件は${MAX}件までです`);
  }
  return db.savedSearch.create({ data: { seekerId: actor.userId, criteria: clean, notify: true } });
}

export async function listSavedSearches(actor: SessionUser) {
  return db.savedSearch.findMany({
    where: { seekerId: actor.userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateSavedSearch(actor: SessionUser, id: string, notify: boolean) {
  await db.savedSearch.updateMany({ where: { id, seekerId: actor.userId }, data: { notify } });
}

export async function deleteSavedSearch(actor: SessionUser, id: string) {
  await db.savedSearch.deleteMany({ where: { id, seekerId: actor.userId } });
}
