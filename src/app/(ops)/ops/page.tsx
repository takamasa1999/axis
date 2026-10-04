import Link from "next/link";
import { formatDate } from "@/lib/format";
import { requireOperator } from "@/server/auth/guards";
import { opsSummary } from "@/server/domain/moderation";

export const metadata = { title: "運営 | Axis" };

export default async function OpsDashboard() {
  const op = await requireOperator();
  const s = await opsSummary(op);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">運営ダッシュボード</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["対応中・未対応の通報", s.openReports, "/ops/reports"],
          ["対応中・未対応のお問い合わせ", s.openInquiries, "/ops/inquiries"],
          ["回数制限にかかった操作（24時間）", s.rateLimited, null],
        ].map(([label, n, href]) => (
          <div key={String(label)} className="pop-card p-5">
            <p className="text-sm font-bold">{label}</p>
            <p className="mt-2 text-4xl font-bold">{n}</p>
            {href && (
              <Link href={href as "/ops"} className="text-sm text-link underline">
                一覧へ
              </Link>
            )}
          </div>
        ))}
      </div>
      <section className="pop-card p-5">
        <h2 className="font-bold">期限を過ぎた修正依頼（未修正・公開中）</h2>
        {s.overdue.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">ありません。</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {s.overdue.map(({ action, job }) => (
              <li key={action.id}>
                <Link href={`/ops/jobs/${job.id}`} className="underline">
                  {job.title}
                </Link>
                （期限 {formatDate(action.fixDeadline)}）：{action.reason}
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-muted-foreground">
        運営は、利用者のメッセージを読めません（通信の秘密）。通報で提出されたメッセージだけを確認できます。求人の内容は運営から書き換えず、修正の依頼・非公開で対応します。
      </p>
    </div>
  );
}
