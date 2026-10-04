import Link from "next/link";

/** フッター。規約・プライバシー・運営者情報・お問い合わせ（FR-036, FR-046） */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t-2 border-ink bg-subtle">
      <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-4 px-4 py-8 text-sm md:flex-row md:items-center md:justify-between">
        <p className="font-bold">Axis — 気軽に、あかるく、まっすぐ。仕事と人の掲示板</p>
        <nav aria-label="フッターメニュー" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/terms" className="hover:underline">
            利用規約
          </Link>
          <Link href="/privacy" className="hover:underline">
            プライバシーポリシー
          </Link>
          <Link href="/company" className="hover:underline">
            運営者情報
          </Link>
          <Link href="/contact" className="hover:underline">
            お問い合わせ・ご相談
          </Link>
          <Link href="/axis-engine" className="hover:underline">
            Axis エンジン
          </Link>
        </nav>
      </div>
    </footer>
  );
}
