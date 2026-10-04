import type { Metadata, Viewport } from "next";
import { Zen_Maru_Gothic } from "next/font/google";
import { MobileTabs } from "@/components/layout/mobile-tabs";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Toaster } from "@/components/ui/sonner";
import { env } from "@/lib/env";
import { getOptionalUser } from "@/server/auth/guards";
import { countUnreadConversations } from "@/server/domain/unread";
import "./globals.css";

// 丸ゴシック（design-system.md）。自前で配信し、外部への通信と表示の崩れを避ける
const maru = Zen_Maru_Gothic({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-maru",
});

export const metadata: Metadata = {
  metadataBase: new URL(env().APP_URL),
  title: { default: "Axis｜気軽に使える、仕事と人の掲示板", template: "%s" },
  description:
    "Axis は、仕事をさがす人と、人をさがす企業が無料で使える掲示板です。見るだけならログイン不要。メッセージで気軽にやり取りできます。",
  openGraph: { siteName: "Axis", locale: "ja_JP", type: "website" },
};

export const viewport: Viewport = { themeColor: "#ffc83d" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getOptionalUser();
  const showTabs = user && (user.kind === "PERSON" || user.kind === "EMPLOYER");
  const unread = showTabs ? await countUnreadConversations(user) : 0;
  return (
    <html lang="ja" className={`${maru.variable} h-full antialiased`}>
      <body
        className={`flex min-h-full flex-col bg-background text-foreground ${showTabs ? "pb-16 md:pb-0" : ""}`}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-sun focus:px-4 focus:py-2"
        >
          本文へ移動
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        {showTabs && <MobileTabs kind={user.kind as "PERSON" | "EMPLOYER"} unread={unread} />}
        <Toaster />
      </body>
    </html>
  );
}
