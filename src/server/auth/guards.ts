import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./session";

/**
 * ルートグループのレイアウトで使う、ログインと役割の確認（T024）。
 * 個々のデータ取得でも policy を通す（二重のチェック）。
 */
export async function requirePerson(): Promise<SessionUser & { axisId: string }> {
  const user = await getSessionUser();
  if (!user || user.kind !== "PERSON" || !user.axisId) redirect("/login");
  return user as SessionUser & { axisId: string };
}

export async function requireAgencyStaff(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.kind !== "STAFF" || user.memberships.length === 0) redirect("/agency/login");
  // TODO(T057): 二要素認証が未設定なら設定画面へ誘導する
  return user;
}

export async function requireOperator(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.kind !== "STAFF" || !user.isOperator) redirect("/agency/login");
  return user;
}
