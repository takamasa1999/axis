import { PenSquare } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/board/empty-state";
import { Container, PageTitle } from "@/components/board/page-title";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { requireSeeker } from "@/server/auth/guards";
import { listOwnPosts, MAX_PUBLISHED } from "@/server/domain/seeker-post";
import { UnpublishButton } from "./unpublish-button";

export const metadata = { title: "「探しています」の投稿 | Axis" };

export default async function MyPostsPage() {
  const user = await requireSeeker();
  const posts = await listOwnPosts(user);
  return (
    <Container narrow>
      <PageTitle
        lead={`どんな仕事を探しているかを投稿すると、企業から声がかかることがあります（公開は${MAX_PUBLISHED}件まで）。`}
        action={
          <Link href="/me/posts/new" className={buttonVariants({ variant: "mint" })}>
            <PenSquare /> 新しく投稿
          </Link>
        }
      >
        「探しています」の投稿
      </PageTitle>
      {posts.length === 0 ? (
        <EmptyState
          title="まだ投稿がありません"
          action={
            <Link href="/me/posts/new" className={buttonVariants({ variant: "mint" })}>
              投稿してみる
            </Link>
          }
        >
          ログインした企業だけが見られます。連絡先は書かず、メッセージでやり取りします。
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li
              key={p.id}
              className="pop-card flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <Badge
                  variant={
                    p.status === "PUBLISHED"
                      ? "mint"
                      : p.status === "HIDDEN"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {p.status === "PUBLISHED"
                    ? "公開中"
                    : p.status === "HIDDEN"
                      ? "運営が公開を停止中"
                      : "非公開"}
                </Badge>
                <p className="mt-1 font-bold">{p.title}</p>
                <p className="text-xs text-muted-foreground">更新 {formatDate(p.updatedAt)}</p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/me/posts/${p.id}/edit`}
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                >
                  編集
                </Link>
                {p.status === "PUBLISHED" && <UnpublishButton postId={p.id} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
