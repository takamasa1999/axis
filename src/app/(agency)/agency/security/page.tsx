import Link from "next/link";
import { requireStaff } from "@/server/auth/guards";
import { TwoFactorSetup } from "./two-factor-setup";

export const metadata = { title: "セキュリティ | Axis" };

export default async function SecurityPage() {
  const user = await requireStaff();
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-12">
      <h1 className="text-2xl font-semibold">二要素認証</h1>
      {user.twoFactorEnabled ? (
        <div className="mt-4 space-y-3 text-sm">
          <p>二要素認証は設定済みです。</p>
          <Link href="/agency/seekers" className="underline">
            求職者の一覧へ
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            求職者の情報を扱うため、紹介会社の方には二要素認証の設定をお願いしています。Google
            Authenticator などの認証アプリを用意してください。
          </p>
          <TwoFactorSetup />
        </>
      )}
    </main>
  );
}
