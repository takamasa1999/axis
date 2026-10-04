import { PenSquare } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/board/empty-state";
import { Container, PageTitle } from "@/components/board/page-title";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { requireEmployer } from "@/server/auth/guards";
import { listOwnJobs } from "@/server/domain/job-post";
import { JobStatusBadge } from "../job-status";
import { JobRowActions } from "./job-row-actions";

export const metadata = { title: "求人の一覧 | Axis" };

export default async function EmployerJobsPage() {
  const user = await requireEmployer();
  const jobs = await listOwnJobs(user);
  return (
    <Container>
      <PageTitle
        lead="公開した求人は、掲載日から最長60日で自動的に掲載が終わります。延長もできます。"
        action={
          <Link href="/employer/jobs/new" className={buttonVariants()}>
            <PenSquare /> 求人を出す
          </Link>
        }
      >
        求人の一覧
      </PageTitle>
      {jobs.length === 0 ? (
        <EmptyState
          title="まだ求人がありません"
          action={
            <Link href="/employer/jobs/new" className={buttonVariants()}>
              最初の求人を出す
            </Link>
          }
        >
          5つのステップで、だれでもかんたんに求人を出せます。
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {jobs.map((j) => (
            <li
              key={j.id}
              className="pop-card flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <JobStatusBadge status={j.status} />
                  <span className="text-xs text-muted-foreground">
                    応募 {j._count.applications} 件
                  </span>
                </div>
                <p className="font-bold">{j.title || "（タイトル未入力）"}</p>
                <p className="text-xs text-muted-foreground">
                  {j.publishedAt ? `掲載日 ${formatDate(j.publishedAt)}` : "未公開"}
                  {j.status === "PUBLISHED" && j.expiresAt
                    ? `・${formatDate(j.expiresAt)}まで`
                    : ""}
                  {j.contentUpdatedAt ? `・最終更新 ${formatDate(j.contentUpdatedAt)}` : ""}
                </p>
              </div>
              <JobRowActions jobId={j.id} status={j.status} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
