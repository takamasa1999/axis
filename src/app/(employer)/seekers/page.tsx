import Link from "next/link";
import { CategoryChip } from "@/components/board/category-icon";
import { EmptyState } from "@/components/board/empty-state";
import { Select } from "@/components/board/form-field";
import { Container, PageTitle } from "@/components/board/page-title";
import { Button } from "@/components/ui/button";
import { employmentLabel, relativeTime } from "@/lib/format";
import { JOB_CATEGORIES, PREFECTURES } from "@/lib/master-data";
import { requireEmployer } from "@/server/auth/guards";
import { listPublishedPosts } from "@/server/domain/seeker-post";

export const metadata = { title: "人をさがす | Axis" };

export default async function SeekersPage(props: PageProps<"/seekers">) {
  const sp = await props.searchParams;
  const user = await requireEmployer();
  const category =
    typeof sp.category === "string" && sp.category in JOB_CATEGORIES ? sp.category : undefined;
  const prefecture =
    typeof sp.prefecture === "string" && (PREFECTURES as readonly string[]).includes(sp.prefecture)
      ? sp.prefecture
      : undefined;
  const posts = await listPublishedPosts(user, { category, prefecture });
  return (
    <Container>
      <PageTitle lead="仕事を探している人の「探しています」の投稿です（新着順）。気になる人には、メッセージで声をかけられます。">
        人をさがす
      </PageTitle>
      <form
        method="get"
        className="pop-card mb-6 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <label className="space-y-1 text-sm font-bold">
          職種
          <Select name="category" defaultValue={category ?? ""}>
            <option value="">すべて</option>
            {Object.entries(JOB_CATEGORIES).map(([k, c]) => (
              <option key={k} value={k}>
                {c.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1 text-sm font-bold">
          働きたい場所
          <Select name="prefecture" defaultValue={prefecture ?? ""}>
            <option value="">すべて</option>
            {PREFECTURES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </label>
        <Button type="submit">絞り込む</Button>
      </form>
      {posts.length === 0 ? (
        <EmptyState title="条件に合う投稿はまだありません">
          条件を変えるか、求人を出して応募を待ってみましょう。
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {posts.map((p) => (
            <li key={p.id}>
              <Link href={`/seekers/${p.id}`} className="pop-card pop-press block bg-card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border-2 border-ink bg-mint px-2.5 text-xs leading-6 font-bold text-[#1e1b2e]">
                    探しています
                  </span>
                  {p.desiredCategory && <CategoryChip category={p.desiredCategory} />}
                </div>
                <h2 className="mt-3 text-lg font-bold">{p.title}</h2>
                <p className="mt-1 line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {p.body}
                </p>
                <p className="mt-3 text-sm">
                  {p.seeker.seekerProfile?.displayName ?? "求職者"}・
                  {p.desiredPrefecture ?? "場所は相談"}・
                  {p.employmentTypes.map(employmentLabel).join("／") || "雇用形態は相談"}
                </p>
                {p.publishedAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {relativeTime(p.publishedAt)}に投稿
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
