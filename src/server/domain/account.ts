import "server-only";
import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { isWeakPassword } from "@/lib/common-passwords";
import { env } from "@/lib/env";
import { DomainError } from "@/lib/result";
import { recordAudit } from "@/server/audit";
import { auth } from "@/server/auth";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db";

export type SignUpInput = {
  kind: "PERSON" | "EMPLOYER";
  email: string;
  password: string;
  /** 求職者は18歳以上であることの確認が必須 */
  confirmAge?: boolean;
  /** 確認メールのリンクを開いたあとに戻るページ */
  next?: string;
};

/** 戻り先は自サイト内のパスだけを許す（外部へのリダイレクトを防ぐ） */
export function safeNext(next: string | undefined | null): string | undefined {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return undefined;
  return next;
}

/**
 * 新規登録（T013 / FR-001〜FR-003, FR-007, FR-046）。
 * 種類（求職者／企業）はここで決め、利用者が運営（STAFF）を名乗る経路を作らない。
 * 確認メールは Better Auth が送る（リンクを開くとログインした状態で /welcome に進む）。
 */
export async function signUp(input: SignUpInput): Promise<{ email: string }> {
  const email = input.email.trim().toLowerCase();
  if (input.kind === "PERSON" && !input.confirmAge) {
    throw new DomainError("VALIDATION", "18歳以上の方がご利用いただけます");
  }
  if (isWeakPassword(input.password, email)) {
    throw new DomainError(
      "VALIDATION",
      "推測されやすいパスワードです。別のパスワードにしてください",
    );
  }
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw new DomainError(
      "CONFLICT",
      "このメールアドレスはすでに登録されています。ログインしてください",
    );
  }

  const next = safeNext(input.next);
  const callbackURL = next ? `/welcome?next=${encodeURIComponent(next)}` : "/welcome";
  try {
    await auth.api.signUpEmail({
      body: { email, password: input.password, name: "", callbackURL },
    });
  } catch (error) {
    if (isAPIError(error)) throw new DomainError("VALIDATION", error.message);
    throw error;
  }

  const now = new Date();
  const user = await db.user.update({
    where: { email },
    data: {
      kind: input.kind,
      termsVersion: env().TERMS_VERSION,
      termsAcceptedAt: now,
      ageConfirmedAt: input.kind === "PERSON" ? now : null,
      // 求職者は Axis エンジン（追加機能）の記録の入れ物を最初から持つ
      ...(input.kind === "PERSON" ? { personalAxis: { create: {} } } : {}),
    },
  });
  await recordAudit({ type: "ACCOUNT_CREATED", actorUserId: user.id });
  return { email };
}

/** 確認メールの再送（FR-002）。登録の有無を明かさない */
export async function resendVerification(email: string, next?: string) {
  const target = safeNext(next);
  await auth.api
    .sendVerificationEmail({
      body: {
        email: email.trim().toLowerCase(),
        callbackURL: target ? `/welcome?next=${encodeURIComponent(target)}` : "/welcome",
      },
      headers: await headers(),
    })
    .catch(() => undefined);
}

/** ログイン後の行き先（プロフィールが未入力なら入力画面へ） */
export async function landingPath(user: SessionUser, next?: string | null): Promise<string> {
  const target = safeNext(next);
  if (user.kind === "PERSON") {
    const profile = await db.seekerProfile.findUnique({
      where: { userId: user.userId },
      select: { id: true },
    });
    if (!profile)
      return `/me/profile?welcome=1${target ? `&next=${encodeURIComponent(target)}` : ""}`;
    return target ?? "/me";
  }
  if (user.kind === "EMPLOYER") {
    const profile = await db.employerProfile.findUnique({
      where: { userId: user.userId },
      select: { id: true },
    });
    if (!profile)
      return `/employer/profile?welcome=1${target ? `&next=${encodeURIComponent(target)}` : ""}`;
    return target ?? "/employer";
  }
  if (user.isOperator) return "/ops";
  return target ?? "/";
}

/** 通知の設定（FR-043） */
export async function updateNotificationSettings(
  actor: SessionUser,
  input: { notifyMessages: boolean; notifyJobAlerts: boolean },
) {
  await db.user.update({ where: { id: actor.userId }, data: input });
}

/**
 * 退会（T064 / FR-044）。
 * 公開中の求人は掲載終了、求職の投稿は非公開にし、会話の相手には「退会したユーザー」と表示する。
 * メッセージは相手の記録として残す。Axis エンジンの記録は本人のものなので削除する。
 */
export async function deleteAccount(actor: SessionUser) {
  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.jobPost.updateMany({
      where: { employerId: actor.userId, status: { in: ["PUBLISHED", "DRAFT"] } },
      data: { status: "CLOSED", closedAt: now },
    });
    await tx.seekerPost.updateMany({
      where: { seekerId: actor.userId, status: "PUBLISHED" },
      data: { status: "UNPUBLISHED" },
    });
    await tx.savedSearch.deleteMany({ where: { seekerId: actor.userId } });
    await tx.personalAxis.deleteMany({ where: { userId: actor.userId } });
    await tx.session.deleteMany({ where: { userId: actor.userId } });
    await tx.account.deleteMany({ where: { userId: actor.userId } });
    await tx.user.update({
      where: { id: actor.userId },
      data: {
        deletedAt: now,
        // 同じメールアドレスで登録し直せるよう、メールアドレスを置き換える
        email: `deleted+${actor.userId}@deleted.axis.invalid`,
        name: "",
        notifyMessages: false,
        notifyJobAlerts: false,
      },
    });
    await tx.seekerProfile.updateMany({
      where: { userId: actor.userId },
      data: {
        displayName: "退会したユーザー",
        experience: null,
        qualifications: null,
        selfIntroduction: null,
      },
    });
    await recordAudit({ type: "ACCOUNT_DELETED", actorUserId: actor.userId }, tx);
  });
}
