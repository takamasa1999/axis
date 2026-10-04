import type { ReactNode } from "react";

/** 規約などの文書ページの共通の枠。公開前に専門家の確認を受けた文面に差し替える */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <p className="pop-card mb-6 bg-sun-soft p-4 text-sm font-bold">
        この文面は下書きです。公開前に、弁護士・社会保険労務士などの専門家の確認を受けたものに差し替えます。
      </p>
      <article className="pop-card space-y-6 p-6 leading-8 sm:p-8 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc">
        <header>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">最終更新：{updated}</p>
        </header>
        {children}
      </article>
    </div>
  );
}
