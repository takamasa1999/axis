import Link from "next/link";
import { EmptyState } from "@/components/board/empty-state";
import { Container, PageTitle } from "@/components/board/page-title";
import { buttonVariants } from "@/components/ui/button";
import { relativeTime } from "@/lib/format";
import { requireMember } from "@/server/auth/guards";
import { listConversations } from "@/server/domain/conversation";

export const metadata = { title: "メッセージ | Axis" };

export default async function MessagesPage() {
  const user = await requireMember("/messages");
  const conversations = await listConversations(user);
  return (
    <Container narrow>
      <PageTitle>メッセージ</PageTitle>
      {conversations.length === 0 ? (
        <EmptyState
          title="まだメッセージはありません"
          action={
            user.kind === "EMPLOYER" ? (
              <Link href="/seekers" className={buttonVariants()}>
                人をさがして声をかける
              </Link>
            ) : (
              <Link href="/jobs" className={buttonVariants()}>
                仕事をさがす
              </Link>
            )
          }
        >
          {user.kind === "EMPLOYER"
            ? "応募や質問が届くと、ここに表示されます。"
            : "気になる求人に応募したり質問したりすると、ここでやり取りできます。"}
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/messages/${c.id}`}
                className="pop-card pop-press flex items-center justify-between gap-3 p-4"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-bold">
                    {c.unread && (
                      <>
                        <span
                          className="inline-block size-2.5 rounded-full bg-coral ring-2 ring-ink"
                          aria-hidden
                        />
                        <span className="sr-only">未読</span>
                      </>
                    )}
                    {c.name}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">{c.preview}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {relativeTime(c.lastMessageAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
