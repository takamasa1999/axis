import { notFound } from "next/navigation";
import { Container, PageTitle } from "@/components/board/page-title";
import { requireSeeker } from "@/server/auth/guards";
import { getOwnPostForEdit } from "@/server/domain/seeker-post";
import { NotFoundError } from "@/server/policy";
import { PostForm } from "../../post-form";

export const metadata = { title: "投稿の編集 | Axis" };

export default async function EditPostPage(props: PageProps<"/me/posts/[id]/edit">) {
  const { id } = await props.params;
  const user = await requireSeeker();
  const post = await getOwnPostForEdit(user, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  return (
    <Container narrow>
      <PageTitle>投稿の編集</PageTitle>
      <PostForm
        postId={post.id}
        published={post.status === "PUBLISHED"}
        initial={{
          title: post.title,
          body: post.body,
          desiredCategory: post.desiredCategory,
          desiredPrefecture: post.desiredPrefecture,
          employmentTypes: post.employmentTypes,
        }}
      />
    </Container>
  );
}
