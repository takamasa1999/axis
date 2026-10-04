import "server-only";
import { notFound, redirect } from "next/navigation";
import { env } from "@/lib/env";
import { DomainError } from "@/lib/result";
import { getSessionUser, type SessionUser } from "./session";

/**
 * 画面・処理で使う、ログインと役割の確認（002 / T012）。
 * 個々のデータ取得でも policy を通す（二重のチェック）。
 */

export const getOptionalUser = getSessionUser;

function loginPath(next?: string) {
  return (next ? `/login?next=${encodeURIComponent(next)}` : "/login") as "/login";
}

export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(loginPath(next));
  return user;
}

/** 求職者（PERSON） */
export async function requireSeeker(next?: string): Promise<SessionUser> {
  const user = await requireUser(next);
  if (user.kind !== "PERSON") redirect(user.kind === "EMPLOYER" ? "/employer" : "/");
  return user;
}

/** 企業（EMPLOYER） */
export async function requireEmployer(next?: string): Promise<SessionUser> {
  const user = await requireUser(next);
  if (user.kind !== "EMPLOYER") redirect(user.kind === "PERSON" ? "/me" : "/");
  return user;
}

/** 運営 */
export async function requireOperator(): Promise<SessionUser> {
  const user = await requireUser("/ops");
  if (user.kind !== "STAFF" || !user.isOperator) notFound();
  return user;
}

/** 求職者・企業（会話・設定の画面） */
export async function requireMember(next?: string): Promise<SessionUser> {
  const user = await requireUser(next);
  if (user.kind !== "PERSON" && user.kind !== "EMPLOYER") redirect("/");
  return user;
}

/** Axis エンジン（001 の本人向けの画面）。利用権の確認は (axis) のレイアウトで行う */
export async function requirePerson(): Promise<SessionUser & { axisId: string }> {
  const user = await requireSeeker("/axis");
  if (!user.axisId) redirect("/axis-engine");
  return user as SessionUser & { axisId: string };
}

/**
 * 投稿・応募・メッセージ送信など「行動」の前の確認（FR-002, FR-035）。
 * メール未確認・停止中なら DomainError を投げる。
 */
export function assertCanAct(user: SessionUser) {
  if (user.suspended) {
    throw new DomainError(
      "SUSPENDED",
      "このアカウントは利用が停止されています。お問い合わせ窓口にご連絡ください",
    );
  }
  if (!user.emailVerified) {
    throw new DomainError(
      "EMAIL_NOT_VERIFIED",
      "メールアドレスの確認が終わっていません。確認メールのリンクを開いてください",
    );
  }
}

// ---- 001 の紹介会社向け（ENABLE_AGENCY_PILOT=true のときだけ） ----

export async function requireAgencyStaff(): Promise<SessionUser> {
  if (!env().ENABLE_AGENCY_PILOT) notFound();
  const user = await getSessionUser();
  if (!user || user.kind !== "STAFF" || user.memberships.length === 0) redirect("/login");
  return user;
}
