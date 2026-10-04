import Link from "next/link";
import { EmptyState } from "@/components/board/empty-state";
import { JobCard } from "@/components/board/job-card";
import { Container, PageTitle } from "@/components/board/page-title";
import { SearchForm } from "@/components/board/search-form";
import { buttonVariants } from "@/components/ui/button";
import { getOptionalUser } from "@/server/auth/guards";
import { parseSearchParams, SORTS, searchJobs } from "@/server/domain/job-search";
import { SaveSearchButton } from "./save-search-button";

export const metadata = { title: "仕事をさがす | Axis" };

export default async function JobsPage(props: PageProps<"/jobs">) {
  const params = parseSearchParams(await props.searchParams);
  const [{ jobs, total, page, pages, sort }, user] = await Promise.all([
    searchJobs(params),
    getOptionalUser(),
  ]);
  const pageHref = (p: number) => {
    const q = new URLSearchParams(
      Object.entries({ ...params, page: p })
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => [k, String(v)]),
    );
    return `/jobs?${q}`;
  };

  return (
    <Container>
      <PageTitle lead={`${total.toLocaleString("ja-JP")} 件の求人（${SORTS[sort]}）`}>
        仕事をさがす
      </PageTitle>
      <SearchForm params={params} compact />
      {user?.kind === "PERSON" && (
        <div className="mt-3 flex justify-end">
          <SaveSearchButton params={params} />
        </div>
      )}
      <div className="mt-6">
        {jobs.length === 0 ? (
          <EmptyState
            title="条件に合う求人がありませんでした"
            action={
              <Link href="/jobs" className={buttonVariants({ variant: "outline" })}>
                条件をクリア
              </Link>
            }
          >
            条件を少しゆるめると、見つかるかもしれません。
          </EmptyState>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {jobs.map((job) => (
              <li key={job.id}>
                <JobCard job={job} />
              </li>
            ))}
          </ul>
        )}
      </div>
      {pages > 1 && (
        <nav aria-label="ページ送り" className="mt-8 flex items-center justify-center gap-3">
          {page > 1 && (
            <Link
              href={pageHref(page - 1) as "/jobs"}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              前へ
            </Link>
          )}
          <span className="text-sm font-bold">
            {page} / {pages}
          </span>
          {page < pages && (
            <Link
              href={pageHref(page + 1) as "/jobs"}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              次へ
            </Link>
          )}
        </nav>
      )}
    </Container>
  );
}
