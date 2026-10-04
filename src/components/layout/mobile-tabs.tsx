"use client";

import { MessageCircle, PenSquare, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** スマートフォンの下部タブ（さがす／メッセージ／投稿する／マイページ）。ログイン中の求職者・企業だけ */
export function MobileTabs({ kind, unread }: { kind: "PERSON" | "EMPLOYER"; unread: number }) {
  const pathname = usePathname();
  const tabs = [
    { href: kind === "EMPLOYER" ? "/seekers" : "/jobs", label: "さがす", Icon: Search },
    { href: "/messages", label: "メッセージ", Icon: MessageCircle, badge: unread },
    {
      href: kind === "EMPLOYER" ? "/employer/jobs/new" : "/me/posts",
      label: "投稿する",
      Icon: PenSquare,
    },
    { href: kind === "EMPLOYER" ? "/employer" : "/me", label: "マイページ", Icon: UserRound },
  ];
  return (
    <nav
      aria-label="下部メニュー"
      className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-4">
        {tabs.map(({ href, label, Icon, badge }) => {
          const active =
            pathname === href ||
            (href !== "/me" && href !== "/employer" && pathname.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href as "/"}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-bold",
                  active ? "bg-sun-soft" : "",
                )}
              >
                <Icon className="size-6" aria-hidden />
                {label}
                {badge ? (
                  <span className="absolute top-2 right-[calc(50%-22px)] inline-flex min-w-5 items-center justify-center rounded-full border-2 border-ink bg-coral px-1 text-[10px] text-[#1e1b2e]">
                    {badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
