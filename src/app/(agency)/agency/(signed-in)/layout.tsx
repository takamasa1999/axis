import { requireAgencyStaff } from "@/server/auth/guards";

/**
 * 紹介会社向け画面（ログイン画面 /agency/login を除く）。
 * STAFF かつ紹介会社に所属していなければ /agency/login へ
 */
export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  await requireAgencyStaff();
  return <div className="mx-auto w-full max-w-5xl px-4 py-6">{children}</div>;
}
