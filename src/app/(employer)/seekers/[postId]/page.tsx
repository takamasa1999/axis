import { notFound } from "next/navigation";
import { CategoryChip } from "@/components/board/category-icon";
import { Container } from "@/components/board/page-title";
import { ReportDialog } from "@/components/board/report-dialog";
import { employmentLabel, formatDate } from "@/lib/format";
import { requireEmployer } from "@/server/auth/guards";
import { getPublishedPost } from "@/server/domain/seeker-post";
import { NotFoundError } from "@/server/policy";
import { ContactForm } from "./contact-form";

export const metadata = { title: "「探しています」の投稿 | Axis", robots: { index: false } };

export default async function SeekerPostPage(props: PageProps<"/seekers/[postId]">) {
  const { postId } = await props.params;
  const user = await requireEmployer();
  const post = await getPublishedPost(user, postId).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  return (
    <Container narrow>
      <article className="pop-card space-y-4 p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border-2 border-ink bg-mint px-2.5 text-xs leading-6 font-bold text-[#1e1b2e]">
            探しています
          </span>
          {post.desiredCategory && <CategoryChip category={post.desiredCategory} />}
        </div>
        <h1 className="text-2xl font-bold">{post.title}</h1>
        <p className="text-sm text-muted-foreground">
          {post.seeker.seekerProfile?.displayName ?? "求職者"}・
          {post.desiredPrefecture ?? "場所は相談"}・
          {post.employmentTypes.map(employmentLabel).join("／") || "雇用形態は相談"}・
          {formatDate(post.publishedAt)}
        </p>
        <p className="leading-8 whitespace-pre-wrap">{post.body}</p>
      </article>
      <section className="pop-card mt-5 space-y-3 p-5">
        <h2 className="text-lg font-bold">声をかける</h2>
        <p className="text-sm text-muted-foreground">
          はじめてのメッセージです。どんな仕事・条件なのか、どうして声をかけたのかを伝えると返事がもらいやすくなります。
        </p>
        <ContactForm postId={post.id} />
      </section>
      <div className="mt-3 flex justify-end">
        <ReportDialog
          targetType="SEEKER_POST"
          targetId={post.id}
          label="この投稿を運営に知らせる"
        />
      </div>
    </Container>
  );
}
