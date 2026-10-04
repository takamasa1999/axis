import { notFound } from "next/navigation";
import { JobEditor } from "@/components/board/job-editor";
import { Container, PageTitle } from "@/components/board/page-title";
import { requireEmployer } from "@/server/auth/guards";
import { getJobForEdit } from "@/server/domain/job-post";
import { NotFoundError } from "@/server/policy";
import { JobStatusBadge } from "../../../job-status";

export const metadata = { title: "求人の編集 | Axis" };

export default async function EditJobPage(props: PageProps<"/employer/jobs/[id]/edit">) {
  const { id } = await props.params;
  const user = await requireEmployer();
  const data = await getJobForEdit(user, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  return (
    <Container narrow>
      <PageTitle
        lead={
          data.job.status === "PUBLISHED"
            ? "公開中の求人です。労働条件を変えると、応募した人に自動で知らせます。"
            : "途中で保存されるので、あとから続きを書けます。"
        }
        action={<JobStatusBadge status={data.job.status} />}
      >
        求人の編集
      </PageTitle>
      <JobEditor jobId={data.job.id} status={data.job.status} initial={data.draft} />
    </Container>
  );
}
