import { notFound } from "next/navigation";
import { formatDate } from "@/lib/format";
import { requireOperator } from "@/server/auth/guards";
import { getUserForReview } from "@/server/domain/moderation";
import { UserModeration } from "./user-moderation";

export const metadata = { title: "アカウントの確認 | Axis 運営" };

export default async function OpsUserPage(props: PageProps<"/ops/users/[id]">) {
  const { id } = await props.params;
  const op = await requireOperator();
  const data = await getUserForReview(op, id).catch(() => null);
  if (!data) notFound();
  const { user, reportedCount, actions } = data;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">アカウントの確認</h1>
      <dl className="pop-card grid gap-2 p-5 text-sm sm:grid-cols-[160px_1fr]">
        <dt className="font-bold">種類</dt>
        <dd>{user.kind}</dd>
        <dt className="font-bold">名前</dt>
        <dd>{user.employerProfile?.companyName ?? user.seekerProfile?.displayName ?? "-"}</dd>
        <dt className="font-bold">メールアドレス</dt>
        <dd>{user.email}</dd>
        <dt className="font-bold">登録日</dt>
        <dd>{formatDate(user.createdAt)}</dd>
        <dt className="font-bold">状態</dt>
        <dd>
          {user.deletedAt
            ? "退会済み"
            : user.suspendedAt
              ? `停止中（${user.suspendedReason}）`
              : "利用中"}
        </dd>
        <dt className="font-bold">件数</dt>
        <dd>
          求人 {user._count.jobPosts}・求職の投稿 {user._count.seekerPosts}・送ったメッセージ{" "}
          {user._count.messagesSent}・通報した数 {user._count.reports}・通報された数 {reportedCount}
        </dd>
      </dl>
      <p className="text-xs text-muted-foreground">
        メッセージの内容は表示されません（通信の秘密）。
      </p>
      <UserModeration userId={user.id} suspended={user.suspendedAt !== null} />
      {actions.length > 0 && (
        <section className="pop-card p-5 text-sm">
          <h2 className="font-bold">対応の履歴</h2>
          <ul className="mt-2 space-y-1">
            {actions.map((a) => (
              <li key={a.id}>
                {a.createdAt.toLocaleString("ja-JP")}：{a.action}（{a.reason}）
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
