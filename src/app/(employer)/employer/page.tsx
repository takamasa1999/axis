import { CalendarClock, MessageCircle, PenSquare, Search } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/board/page-title";
import { buttonVariants } from "@/components/ui/button";
import { formatDate, relativeTime } from "@/lib/format";
import { requireEmployer } from "@/server/auth/guards";
import { listConversations } from "@/server/domain/conversation";
import { getEmployerProfile } from "@/server/domain/employer";
import { listOwnJobs } from "@/server/domain/job-post";
import { JobStatusBadge } from "./job-status";

export const metadata = { title: "企業のマイページ | Axis" };

const WEEK = 7 * 24 * 60 * 60 * 1000;

export default async function EmployerDashboard() {
  const user = await requireEmployer();
  const [profile, jobs, conversations] = await Promise.all([
    getEmployerProfile(user.userId),
    listOwnJobs(user),
    listConversations(user),
  ]);
  const published = jobs.filter((j) => j.status === "PUBLISHED");
  const expiringSoon = published.filter(
    (j) => j.expiresAt && j.expiresAt.getTime() - Date.now() < WEEK,
  );
  const hidden = jobs.filter((j) => j.status === "HIDDEN");
  const unread = conversations.filter((c) => c.unread);

  return (
    <Container>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">こんにちは</p>
          <h1 className="text-2xl font-bold sm:text-3xl">{profile?.companyName ?? "企業"} さん</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/employer/jobs/new" className={buttonVariants()}>
            <PenSquare /> 求人を出す
          </Link>
          <Link href="/seekers" className={buttonVariants({ variant: "mint" })}>
            <Search /> 人をさがす
          </Link>
        </div>
      </div>

      {!user.emailVerified && (
        <p className="pop-card mb-6 bg-sun-soft p-4 text-sm">
          メールアドレスの確認が終わっていません。確認メールのリンクを開いてください。
        </p>
      )}
      {hidden.length > 0 && (
        <p className="pop-card mb-6 bg-sun-soft p-4 text-sm">
          運営が掲載を止めている求人が {hidden.length}{" "}
          件あります。メールでお送りした内容を確認し、求人を直してください。
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        <section className="pop-card p-5">
          <h2 className="font-bold">公開中の求人</h2>
          <p className="mt-2 text-4xl font-bold">
            {published.length}
            <span className="ml-1 text-base">件</span>
          </p>
          <Link href="/employer/jobs" className="mt-2 inline-block text-sm text-link underline">
            求人の一覧へ
          </Link>
        </section>
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
            <CalendarClock className="size-5" aria-hidden /> もうすぐ掲載期限
          </h2>
          {expiringSoon.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              7日以内に期限が来る求人はありません。
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {expiringSoon.map((j) => (
                <li key={j.id}>
                  <Link href={`/employer/jobs`} className="underline">
                    {j.title}
                  </Link>
                  （{formatDate(j.expiresAt)}まで）
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">最近のやり取り</h2>
        {conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            まだメッセージはありません。求人を出すか、「人をさがす」から声をかけてみましょう。
          </p>
        ) : (
          <ul className="space-y-2">
            {conversations.slice(0, 5).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/messages/${c.id}`}
                  className="pop-card pop-press flex items-center justify-between gap-3 p-4"
                >
                  <span className="min-w-0">
                    <span className="font-bold">{c.name}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {c.preview}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {c.unread && (
                      <span className="mr-2 rounded-full bg-coral px-2 py-0.5 font-bold text-[#1e1b2e]">
                        未読
                      </span>
                    )}
                    {relativeTime(c.lastMessageAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">求人</h2>
        <ul className="space-y-2">
          {jobs.slice(0, 5).map((j) => (
            <li key={j.id} className="flex flex-wrap items-center gap-2 text-sm">
              <JobStatusBadge status={j.status} />
              <Link href={`/employer/jobs/${j.id}/edit`} className="underline">
                {j.title || "（タイトル未入力）"}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
