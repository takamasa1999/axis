import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/guards";
import { landingPath } from "@/server/domain/account";

/** ログイン・メール確認のあとの振り分け（プロフィールが未入力なら入力画面へ） */
export default async function WelcomePage(props: PageProps<"/welcome">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const user = await requireUser(next);
  redirect((await landingPath(user, next)) as "/");
}
