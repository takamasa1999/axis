import Link from "next/link";
import { requirePerson } from "@/server/auth/guards";

/** Axis エンジン（追加機能）。001 の本人向けの画面。利用権の確認は T067 で追加する */
export default async function AxisLayout({ children }: LayoutProps<"/axis">) {
  await requirePerson();
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <nav className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full border-2 border-ink bg-lilac px-3 py-0.5 font-bold text-[#1e1b2e]">
          Axis エンジン
        </span>
        <Link href="/axis" className="hover:underline">
          節目の一覧
        </Link>
        <Link href="/axis/sharing" className="hover:underline">
          共有の管理
        </Link>
      </nav>
      {children}
    </div>
  );
}
