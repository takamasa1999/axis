import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { requireAgencyStaff } from "@/server/auth/guards";

/**
 * 紹介会社向け画面（ログイン画面・二要素認証の設定画面を除く）。
 * 001 の紹介会社向け（ENABLE_AGENCY_PILOT=true のときだけ）。STAFF かつ紹介会社に所属していなければ /login へ
 */
export default async function AgencyLayout({ children }: LayoutProps<"/">) {
  const user = await requireAgencyStaff();
  const isAdmin = user.memberships.some((m) => m.role === "ADMIN");
  return (
    <>
      <header className="border-b">
        <nav className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-4 px-4 py-3 text-sm">
          <span className="font-semibold">Axis for Agency</span>
          <Link href="/agency/seekers" className="text-muted-foreground hover:text-foreground">
            求職者
          </Link>
          <Link
            href="/agency/invitations/new"
            className="text-muted-foreground hover:text-foreground"
          >
            案内を送る
          </Link>
          <span className="ml-auto text-xs text-muted-foreground">{isAdmin ? "管理者" : "CA"}</span>
          <SignOutButton redirectTo="/login" />
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
