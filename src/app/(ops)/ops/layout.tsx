import Link from "next/link";
import { requireOperator } from "@/server/auth/guards";

/** 運営の画面。運営（isOperator）でなければ 404 */
export default async function OpsLayout({ children }: LayoutProps<"/ops">) {
  await requireOperator();
  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 py-6">
      <nav aria-label="運営メニュー" className="mb-6 flex flex-wrap gap-2 text-sm font-bold">
        {[
          ["/ops", "ダッシュボード"],
          ["/ops/reports", "通報"],
          ["/ops/inquiries", "お問い合わせ"],
          ["/ops/entitlements", "追加機能の利用権"],
          ["/ops/metrics", "集計"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href as "/ops"}
            className="rounded-full border-2 border-ink bg-card px-3 py-1 hover:bg-sun-soft"
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
