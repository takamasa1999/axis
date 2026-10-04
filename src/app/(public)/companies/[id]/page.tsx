import { Building2, Globe, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/board/empty-state";
import { JobCard } from "@/components/board/job-card";
import { db } from "@/server/db";
import { getPublicEmployer } from "@/server/domain/employer";
import { openJobWhere } from "@/server/domain/job-search";

export async function generateMetadata(props: PageProps<"/companies/[id]">) {
  const { id } = await props.params;
  const profile = await getPublicEmployer(id).catch(() => null);
  return { title: profile ? `${profile.companyName}の求人 | Axis` : "企業が見つかりません | Axis" };
}

export default async function CompanyPage(props: PageProps<"/companies/[id]">) {
  const { id } = await props.params;
  const profile = await getPublicEmployer(id).catch(() => null);
  if (!profile) notFound();
  const jobs = await db.jobPost.findMany({
    where: { ...openJobWhere(), employerId: id },
    orderBy: { publishedAt: "desc" },
    include: { employer: { select: { employerProfile: { select: { companyName: true } } } } },
  });
  return (
    <div className="mx-auto w-full max-w-[1040px] space-y-6 px-4 py-8">
      <header className="pop-card space-y-3 p-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
          <Building2 className="size-7" aria-hidden />
          {profile.companyName}
        </h1>
        <p className="flex items-center gap-1 text-sm">
          <MapPin className="size-4" aria-hidden />
          {profile.prefecture}
          {profile.address}
        </p>
        {profile.websiteUrl && (
          <a
            href={profile.websiteUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="flex items-center gap-1 text-sm text-link underline"
          >
            <Globe className="size-4" aria-hidden />
            ホームページ
          </a>
        )}
        <p className="whitespace-pre-wrap leading-7">{profile.businessDescription}</p>
      </header>
      <section>
        <h2 className="mb-3 text-xl font-bold">募集中の求人（{jobs.length}件）</h2>
        {jobs.length === 0 ? (
          <EmptyState title="いまは募集中の求人がありません" />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {jobs.map((job) => (
              <li key={job.id}>
                <JobCard job={job} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
