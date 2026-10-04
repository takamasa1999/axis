import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getOptionalUser } from "@/server/auth/guards";
import { countUnreadConversations } from "@/server/domain/unread";
import { Logo } from "./logo";

/** ヘッダー（PC ではナビゲーション、スマートフォンではロゴとログインだけ。操作は下部タブ） */
export async function SiteHeader() {
  const user = await getOptionalUser();
  const unread = user ? await countUnreadConversations(user) : 0;
  const home =
    user?.kind === "EMPLOYER"
      ? "/employer"
      : user?.kind === "PERSON"
        ? "/me"
        : user?.isOperator
          ? "/ops"
          : null;

  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1040px] items-center gap-3 px-4 sm:gap-6">
        <Logo />
        <nav
          className="hidden items-center gap-5 text-sm font-bold md:flex"
          aria-label="メインメニュー"
        >
          <Link href="/jobs" className="hover:underline">
            仕事をさがす
          </Link>
          {user?.kind === "EMPLOYER" && (
            <Link href="/seekers" className="hover:underline">
              人をさがす
            </Link>
          )}
          {user && user.kind !== "STAFF" && (
            <Link href="/messages" className="relative hover:underline">
              メッセージ
              {unread > 0 && (
                <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full border-2 border-ink bg-coral px-1 text-xs text-[#1e1b2e]">
                  {unread}
                </span>
              )}
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {home ? (
            <Link
              href={home as "/"}
              className={buttonVariants({
                size: "sm",
                variant: "outline",
                className: "px-3 sm:px-4",
              })}
            >
              マイページ
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonVariants({ size: "sm", variant: "ghost", className: "px-3" })}
              >
                ログイン
              </Link>
              <Link
                href="/signup"
                className={buttonVariants({ size: "sm", className: "px-3 sm:px-4" })}
              >
                <span className="sm:hidden">はじめる</span>
                <span className="hidden sm:inline">無料ではじめる</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
