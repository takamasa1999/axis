import { BellRing, MessageCircle, PenSquare, Search, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/board/page-title";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { relativeTime } from "@/lib/format";
import { requireSeeker } from "@/server/auth/guards";
import { listMyApplications } from "@/server/domain/application";
import { listConversations } from "@/server/domain/conversation";
import { isOpen } from "@/server/domain/job-post";
import { getSeekerProfile } from "@/server/domain/seeker";
import { listOwnPosts } from "@/server/domain/seeker-post";

export const metadata = { title: "マイページ | Axis" };

export default async function SeekerHome() {
  const user = await requireSeeker();
  const [profile, applications, conversations, posts] = await Promise.all([
    getSeekerProfile(user.userId),
    listMyApplications(user),
    listConversations(user),
    listOwnPosts(user),
  ]);
  const unread = conversations.filter((c) => c.unread);
  const filled = profile
    ? [
        profile.experience,
        profile.qualifications,
        profile.selfIntroduction,
        profile.desiredCategories.length > 0,
      ].filter(Boolean).length
    : 0;

  return (
    <Container>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">こんにちは</p>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {profile?.displayName ?? "ようこそ"} さん
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/jobs" className={buttonVariants()}>
            <Search /> 仕事をさがす
          </Link>
          <Link href="/me/posts" className={buttonVariants({ variant: "mint" })}>
            <PenSquare /> 「探しています」を投稿
          </Link>
        </div>
      </div>

      {!user.emailVerified && (
        <p className="pop-card mb-6 bg-sun-soft p-4 text-sm">
          メールアドレスの確認が終わっていません。確認メールのリンクを開いてください。
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        <section className="pop-card p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <MessageCircle className="size-5" aria-hidden /> 未読のメッセージ
          </h2>
          <p className="mt-2 text-4xl font-bold">
            {unread.length}
            <span className="ml-1 text-base">件</span>
          </p>
          <Link href="/messages" className="mt-2 inline-block text-sm text-link underline">
            メッセージへ
          </Link>
        </section>
        <section className="pop-card p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <UserRound className="size-5" aria-hidden /> プロフィール
          </h2>
          <p className="mt-2 text-sm">
            {filled < 4 ? "書くほど、自分のことを伝えやすくなります。" : "しっかり書けています！"}
          </p>
          <div
            className="mt-2 h-3 overflow-hidden rounded-full border-2 border-ink bg-card"
            role="progressbar"
            aria-valuenow={filled}
            aria-valuemin={0}
            aria-valuemax={4}
            aria-label="プロフィールの入力状況"
          >
            <div className="h-full bg-mint" style={{ width: `${(filled / 4) * 100}%` }} />
          </div>
          <Link href="/me/profile" className="mt-2 inline-block text-sm text-link underline">
            プロフィールを書く
          </Link>
        </section>
        <section className="pop-card p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <BellRing className="size-5" aria-hidden /> 新着のお知らせ
          </h2>
          <p className="mt-2 text-sm">条件を保存すると、合う求人が出たときにメールで届きます。</p>
          <Link href="/me/searches" className="mt-2 inline-block text-sm text-link underline">
            保存した条件
          </Link>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">応募した求人</h2>
        {applications.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            まだ応募していません。気になる求人があれば、まずは質問してみるのもおすすめです。
          </p>
        ) : (
          <ul className="space-y-2">
            {applications.map((a) => (
              <li
                key={a.id}
                className="pop-card flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <span className="min-w-0">
                  <span className="block font-bold">{a.jobPost.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {a.jobPost.employer.employerProfile?.companyName}・{relativeTime(a.createdAt)}
                    に応募
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {!isOpen(a.jobPost) && <Badge variant="outline">募集終了</Badge>}
                  <Link
                    href={`/messages/${a.conversationId}`}
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                  >
                    やり取りを見る
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">「探しています」の投稿</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            どんな仕事を探しているかを投稿すると、企業から声がかかることがあります。
            <Link href="/me/posts/new" className="ml-1 text-link underline">
              投稿してみる
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {posts.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <Badge variant={p.status === "PUBLISHED" ? "mint" : "secondary"}>
                  {p.status === "PUBLISHED"
                    ? "公開中"
                    : p.status === "HIDDEN"
                      ? "運営が停止中"
                      : "非公開"}
                </Badge>
                <Link href={`/me/posts/${p.id}/edit`} className="underline">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="pop-card mt-8 flex flex-wrap items-center justify-between gap-4 bg-lilac p-5 text-[#1e1b2e]">
        <div>
          <p className="flex items-center gap-2 font-bold">
            <Sparkles className="size-5" aria-hidden /> Axis エンジン（追加機能）
          </p>
          <p className="mt-1 text-sm">
            AI との対話で、自分の大切にしたいことを整理して、節目ごとに残せます。
          </p>
        </div>
        <Link href="/axis" className={buttonVariants({ variant: "outline" })}>
          くわしく見る
        </Link>
      </section>
    </Container>
  );
}
