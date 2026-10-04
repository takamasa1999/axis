import { notFound, redirect } from "next/navigation";
import { Container, PageTitle } from "@/components/board/page-title";
import { requireSeeker } from "@/server/auth/guards";
import { hasApplied } from "@/server/domain/application";
import { getPublicJob } from "@/server/domain/job-post";
import { getSeekerProfile } from "@/server/domain/seeker";
import { ApplyForm } from "./apply-form";

export const metadata = { title: "応募・質問 | Axis" };

export default async function ApplyPage(props: PageProps<"/jobs/[id]/apply">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const question = sp.mode === "question";
  const user = await requireSeeker(`/jobs/${id}/apply${question ? "?mode=question" : ""}`);
  const data = await getPublicJob(id);
  if (!data) notFound();
  if (!data.open) redirect(`/jobs/${id}`);

  const profile = await getSeekerProfile(user.userId);
  if (!profile)
    redirect(
      `/me/profile?welcome=1&next=${encodeURIComponent(`/jobs/${id}/apply${question ? "?mode=question" : ""}`)}`,
    );
  if (!question) {
    const conversationId = await hasApplied(user, id);
    if (conversationId) redirect(`/messages/${conversationId}`);
  }

  const company = data.job.employer.employerProfile?.companyName ?? "企業";
  return (
    <Container narrow>
      <PageTitle lead={`${company}「${data.job.title}」`}>
        {question ? "質問してみる" : "応募する"}
      </PageTitle>
      {!user.emailVerified && (
        <p className="pop-card mb-4 bg-sun-soft p-4 text-sm">
          メールアドレスの確認が終わっていません。確認メールのリンクを開いてから送ってください。
        </p>
      )}
      <ApplyForm
        jobId={id}
        company={company}
        mode={question ? "question" : "apply"}
        profile={{
          displayName: profile.displayName,
          desiredCategories: profile.desiredCategories,
          desiredPrefectures: profile.desiredPrefectures,
          experience: profile.experience,
          qualifications: profile.qualifications,
          selfIntroduction: profile.selfIntroduction,
        }}
      />
    </Container>
  );
}
