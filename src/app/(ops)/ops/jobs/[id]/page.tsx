import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, formatSalary } from "@/lib/format";
import { requireOperator } from "@/server/auth/guards";
import { getJobForReview } from "@/server/domain/moderation";
import { JobModeration } from "./job-moderation";

export const metadata = { title: "求人の確認 | Axis 運営" };

export default async function OpsJobPage(props: PageProps<"/ops/jobs/[id]">) {
  const { id } = await props.params;
  const op = await requireOperator();
  const data = await getJobForReview(op, id).catch(() => null);
  if (!data) notFound();
  const { job, actions } = data;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">求人の確認</h1>
      <p className="text-sm text-muted-foreground">
        運営は求人の内容を書き換えません。問題があれば修正を依頼するか、掲載を止めてください。
      </p>
      <section className="pop-card space-y-2 p-5 text-sm">
        <p>
          状態：<strong>{job.status}</strong>・版 {job.version}・掲載日{" "}
          {formatDate(job.publishedAt)}・最終更新 {formatDate(job.contentUpdatedAt)}
        </p>
        <p className="text-lg font-bold">{job.title}</p>
        <p>{formatSalary(job.salaryType, job.salaryMin, job.salaryMax)}</p>
        <p className="whitespace-pre-wrap">{job.jobDescription}</p>
        <p>
          企業：
          <Link href={`/ops/users/${job.employer.id}`} className="underline">
            {job.employer.employerProfile?.companyName}（{job.employer.email}）
          </Link>
        </p>
        {job.status === "PUBLISHED" || job.status === "CLOSED" || job.status === "EXPIRED" ? (
          <Link href={`/jobs/${job.id}`} className="text-link underline">
            公開ページで全項目を見る
          </Link>
        ) : null}
      </section>
      <JobModeration jobId={job.id} hidden={job.status === "HIDDEN"} />
      <section className="pop-card p-5 text-sm">
        <h2 className="font-bold">対応の履歴</h2>
        {actions.length === 0 ? (
          <p className="mt-1 text-muted-foreground">ありません。</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {actions.map((a) => (
              <li key={a.id}>
                {a.createdAt.toLocaleString("ja-JP")}：{a.action}（{a.reason}）
                {a.fixDeadline ? ` 期限 ${formatDate(a.fixDeadline)}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
