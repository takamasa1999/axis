import Link from "next/link";
import { EmptyState } from "@/components/board/empty-state";
import { Container, PageTitle } from "@/components/board/page-title";
import { buttonVariants } from "@/components/ui/button";
import { categoryLabel, employmentLabel } from "@/lib/format";
import { SALARY_TYPES, type SalaryType } from "@/lib/master-data";
import { requireSeeker } from "@/server/auth/guards";
import { listSavedSearches } from "@/server/domain/saved-search";
import { SearchRowActions } from "./search-row-actions";

export const metadata = { title: "保存した条件 | Axis" };

function describe(c: Record<string, unknown>) {
  const parts: string[] = [];
  if (c.q) parts.push(`「${c.q}」`);
  if (c.category) parts.push(categoryLabel(String(c.category)));
  if (c.prefecture) parts.push(String(c.prefecture));
  if (c.type) parts.push(employmentLabel(String(c.type)));
  if (c.salaryType)
    parts.push(
      `${SALARY_TYPES[c.salaryType as SalaryType]}${c.salaryMin ? ` ${Number(c.salaryMin).toLocaleString("ja-JP")}円以上` : ""}`,
    );
  return parts.length ? parts.join("・") : "すべての求人";
}

export default async function SavedSearchesPage() {
  const user = await requireSeeker();
  const searches = await listSavedSearches(user);
  return (
    <Container narrow>
      <PageTitle lead="条件に合う新しい求人が出たら、毎朝メールでお知らせします。">
        保存した条件
      </PageTitle>
      {searches.length === 0 ? (
        <EmptyState
          title="保存した条件はありません"
          action={
            <Link href="/jobs" className={buttonVariants()}>
              仕事をさがす
            </Link>
          }
        >
          仕事をさがす画面で条件を選び、「この条件で新着を受け取る」を押すと保存できます。
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {searches.map((s) => {
            const c = (s.criteria ?? {}) as Record<string, unknown>;
            const query = new URLSearchParams(Object.entries(c).map(([k, v]) => [k, String(v)]));
            return (
              <li
                key={s.id}
                className="pop-card flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <Link href={`/jobs?${query}` as "/jobs"} className="font-bold underline">
                  {describe(c)}
                </Link>
                <SearchRowActions id={s.id} notify={s.notify} />
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
