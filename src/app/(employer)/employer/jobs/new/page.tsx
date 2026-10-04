import { redirect } from "next/navigation";
import { JobEditor } from "@/components/board/job-editor";
import { Container, PageTitle } from "@/components/board/page-title";
import { requireEmployer } from "@/server/auth/guards";
import { JobDraftSchema } from "@/server/compliance/job-post";
import { getEmployerProfile } from "@/server/domain/employer";

export const metadata = { title: "求人を出す | Axis" };

export default async function NewJobPage() {
  const user = await requireEmployer();
  if (!(await getEmployerProfile(user.userId)))
    redirect("/employer/profile?welcome=1&next=/employer/jobs/new");
  return (
    <Container narrow>
      <PageTitle lead="5つのステップで公開できます。途中で保存されるので、あとから続きを書けます。">
        求人を出す
      </PageTitle>
      <JobEditor jobId={null} status="DRAFT" initial={JobDraftSchema.parse({})} />
    </Container>
  );
}
