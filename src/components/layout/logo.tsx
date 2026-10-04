import Link from "next/link";

/** ロゴ。黄色い付箋に「Axis」 */
export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 font-bold" aria-label="Axis トップへ">
      <span className="inline-flex size-9 -rotate-6 items-center justify-center rounded-lg border-2 border-ink bg-sun text-lg text-[#1e1b2e] shadow-pop-sm">
        A
      </span>
      <span className="hidden text-xl tracking-wide min-[360px]:inline">Axis</span>
    </Link>
  );
}
