import type { ReactNode } from "react";

/** 認証まわりの画面の共通の枠 */
export function AuthShell({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <div className="pop-card p-6 sm:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        {lead && <div className="mt-2 text-sm text-muted-foreground">{lead}</div>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
