import { requireOperator } from "@/server/auth/guards";
import { boardMetrics } from "@/server/domain/metrics";

export const metadata = { title: "集計 | Axis 運営" };

function parseDate(v: string | string[] | undefined, fallback: Date) {
  const d = typeof v === "string" ? new Date(`${v}T00:00:00+09:00`) : fallback;
  return Number.isNaN(d.getTime()) ? fallback : d;
}
const ymd = (d: Date) => new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);

export default async function MetricsPage(props: PageProps<"/ops/metrics">) {
  const sp = await props.searchParams;
  const op = await requireOperator();
  const now = new Date();
  const from = parseDate(sp.from, new Date(now.getFullYear(), 0, 1));
  const toInclusive = parseDate(sp.to, now);
  const to = new Date(toInclusive.getTime() + 24 * 3600 * 1000);
  const m = await boardMetrics(op, from, to);
  const rows: [string, number][] = [
    ["期間内に公開した求人（初回公開日ベース）", m.jobsPublished],
    ["いま公開中の求人", m.jobsOpenNow],
    ["期間内に登録した求職者", m.seekersRegistered],
    ["期間内に登録した企業", m.employersRegistered],
    ["応募", m.applications],
    ["始まった会話", m.conversations],
    ["公開された求職の投稿", m.seekerPosts],
    ["通報", m.reports],
    ["お問い合わせ（苦情・相談）", m.inquiries],
    ["運営の対応", m.moderation],
  ];
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">集計（事業概況報告用）</h1>
      <form method="get" className="pop-card flex flex-wrap items-end gap-3 p-4 text-sm">
        <label className="space-y-1 font-bold">
          開始日
          <input
            type="date"
            name="from"
            defaultValue={ymd(from)}
            className="block h-12 rounded-xl border-2 border-ink bg-card px-3"
          />
        </label>
        <label className="space-y-1 font-bold">
          終了日
          <input
            type="date"
            name="to"
            defaultValue={ymd(toInclusive)}
            className="block h-12 rounded-xl border-2 border-ink bg-card px-3"
          />
        </label>
        <button
          type="submit"
          className="h-12 rounded-full border-2 border-ink bg-sun px-5 font-bold text-[#1e1b2e] shadow-pop-sm"
        >
          集計する
        </button>
      </form>
      <table className="pop-card w-full overflow-hidden text-sm">
        <tbody>
          {rows.map(([label, n]) => (
            <tr key={label} className="border-b-2 border-ink/10 last:border-0">
              <th className="p-3 text-left font-bold">{label}</th>
              <td className="p-3 text-right text-lg font-bold">{n.toLocaleString("ja-JP")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground">
        件数だけを集計しています。報告書の様式に合わせて転記してください。
      </p>
    </div>
  );
}
