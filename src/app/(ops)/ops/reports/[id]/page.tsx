import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/format";
import { REPORT_REASONS } from "@/lib/master-data";
import { requireOperator } from "@/server/auth/guards";
import { getReportDetail } from "@/server/domain/moderation";
import { ReportActions } from "./report-actions";

export const metadata = { title: "通報の詳細 | Axis 運営" };

export default async function ReportDetailPage(props: PageProps<"/ops/reports/[id]">) {
  const { id } = await props.params;
  const op = await requireOperator();
  const data = await getReportDetail(op, id).catch(() => null);
  if (!data) notFound();
  const { report, target } = data;
  return (
    <div className="space-y-5">
      <Link href="/ops/reports" className="text-sm underline">
        ← 通報の一覧
      </Link>
      <h1 className="text-2xl font-bold">通報の詳細</h1>
      <dl className="pop-card grid gap-2 p-5 text-sm sm:grid-cols-[140px_1fr]">
        <dt className="font-bold">受付</dt>
        <dd>
          {formatDate(report.receivedAt)}（一次対応{" "}
          {report.firstHandledAt ? formatDate(report.firstHandledAt) : "まだ"}）
        </dd>
        <dt className="font-bold">状態</dt>
        <dd>{report.status}</dd>
        <dt className="font-bold">理由</dt>
        <dd>{REPORT_REASONS[report.reason]}</dd>
        <dt className="font-bold">くわしく</dt>
        <dd className="whitespace-pre-wrap">{report.detail ?? "（なし）"}</dd>
        <dt className="font-bold">対象</dt>
        <dd className="whitespace-pre-wrap">
          {target.href ? (
            <Link href={target.href as "/ops"} className="underline">
              {target.label}
            </Link>
          ) : (
            target.label
          )}
        </dd>
        <dt className="font-bold">通報した人</dt>
        <dd>
          <Link href={`/ops/users/${report.reporter.id}`} className="underline">
            {report.reporter.kind}（{report.reporter.email}）
          </Link>
        </dd>
      </dl>

      {report.evidence.length > 0 && (
        <section className="pop-card p-5">
          <h2 className="font-bold">通報者が提出したメッセージ（{report.evidence.length}件）</h2>
          <p className="text-xs text-muted-foreground">
            会話の残りは、運営も見ることができません。
          </p>
          <ol className="mt-3 space-y-2">
            {report.evidence.map((e) => (
              <li key={e.id} className="rounded-xl border-2 border-ink p-3 text-sm">
                <p className="text-xs font-bold">
                  {e.senderRole === "REPORTER" ? "通報者" : "相手"}・
                  {e.sentAt.toLocaleString("ja-JP")}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{e.bodyPlain}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <ReportActions
        reportId={report.id}
        targetType={report.targetType}
        targetId={report.targetId}
        ownerId={target.ownerId ?? null}
      />

      {report.moderationActions.length > 0 && (
        <section className="pop-card p-5 text-sm">
          <h2 className="font-bold">この通報に対する対応</h2>
          <ul className="mt-2 space-y-1">
            {report.moderationActions.map((a) => (
              <li key={a.id}>
                {a.createdAt.toLocaleString("ja-JP")}：{a.action}（{a.reason}）
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
