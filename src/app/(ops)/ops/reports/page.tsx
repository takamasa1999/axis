import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { REPORT_REASONS } from "@/lib/master-data";
import { requireOperator } from "@/server/auth/guards";
import { listReports } from "@/server/domain/moderation";

export const metadata = { title: "通報 | Axis 運営" };

const TARGET = {
  JOB_POST: "求人",
  SEEKER_POST: "求職の投稿",
  MESSAGE: "メッセージ",
  USER: "アカウント",
} as const;
const STATUS = {
  OPEN: "未対応",
  IN_REVIEW: "対応中",
  RESOLVED: "対応済み",
  DISMISSED: "対応不要",
} as const;

export default async function ReportsPage(props: PageProps<"/ops/reports">) {
  const sp = await props.searchParams;
  const status =
    typeof sp.status === "string" && sp.status in STATUS
      ? (sp.status as keyof typeof STATUS)
      : undefined;
  const op = await requireOperator();
  const reports = await listReports(op, status);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">通報（受付の古い順）</h1>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/ops/reports" className="underline">
          未対応・対応中
        </Link>
        <Link href="/ops/reports?status=RESOLVED" className="underline">
          対応済み
        </Link>
        <Link href="/ops/reports?status=DISMISSED" className="underline">
          対応不要
        </Link>
      </div>
      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">ありません。</p>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.id}>
              <Link
                href={`/ops/reports/${r.id}`}
                className="pop-card pop-press flex flex-wrap items-center gap-3 p-4"
              >
                <Badge variant={r.status === "OPEN" ? "coral" : "secondary"}>
                  {STATUS[r.status]}
                </Badge>
                <span className="font-bold">{TARGET[r.targetType]}</span>
                <span>{REPORT_REASONS[r.reason]}</span>
                {r._count.evidence > 0 && (
                  <span className="text-xs">提出されたメッセージ {r._count.evidence} 件</span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  受付 {formatDate(r.receivedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
