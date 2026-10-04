import { Container, PageTitle } from "@/components/board/page-title";
import { requireSeeker } from "@/server/auth/guards";
import { PostForm } from "../post-form";

export const metadata = { title: "「探しています」を投稿 | Axis" };

export default async function NewPostPage() {
  await requireSeeker();
  return (
    <Container narrow>
      <PageTitle>「探しています」を投稿</PageTitle>
      <PostForm
        postId={null}
        published={false}
        initial={{
          title: "",
          body: "",
          desiredCategory: null,
          desiredPrefecture: null,
          employmentTypes: [],
        }}
      />
    </Container>
  );
}
