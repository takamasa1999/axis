import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { requirePerson } from "@/server/auth/guards";

/** 本人向け画面。PERSON でログインしていなければ /login へ */
export default async function PersonLayout({ children }: LayoutProps<"/">) {
  await requirePerson();
  return (
    <>
      <header className="border-b">
        <nav className="mx-auto flex w-full max-w-2xl items-center gap-4 px-4 py-3 text-sm">
          <Link href="/home" className="font-semibold">
            Axis
          </Link>
          <Link href="/home" className="text-muted-foreground hover:text-foreground">
            ホーム
          </Link>
          <Link href="/sharing" className="text-muted-foreground hover:text-foreground">
            共有の管理
          </Link>
          <div className="ml-auto">
            <SignOutButton />
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
