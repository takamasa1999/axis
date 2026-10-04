import { Building2, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { employmentLabel, formatSalary, relativeTime } from "@/lib/format";
import type { SalaryType } from "@/lib/master-data";
import { CategoryChip } from "./category-icon";

export type JobCardProps = {
  id: string;
  title: string;
  category: string | null;
  employmentType: string | null;
  prefecture: string | null;
  city: string | null;
  remoteWork: string;
  salaryType: SalaryType | null;
  salaryMin: number | null;
  salaryMax: number | null;
  publishedAt: Date | null;
  employer: { employerProfile: { companyName: string } | null };
};

/** 求人カード。上から：職種 → タイトル → 企業名 → 給与（大きく）→ 勤務地・雇用形態 → 掲載日（design-system.md） */
export function JobCard({ job }: { job: JobCardProps }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="pop-card pop-press block p-5 focus-visible:outline-3 focus-visible:outline-sky-pop"
    >
      <div className="flex flex-wrap items-center gap-2">
        <CategoryChip category={job.category} />
        {job.employmentType && (
          <span className="rounded-full border-2 border-ink bg-card px-2.5 text-xs leading-6 font-bold">
            {employmentLabel(job.employmentType)}
          </span>
        )}
        {job.employmentType === "DISPATCH" && (
          <span className="rounded-full bg-ink px-2.5 text-xs leading-6 font-bold text-paper">
            派遣
          </span>
        )}
      </div>
      <h3 className="mt-3 text-lg leading-snug font-bold">{job.title}</h3>
      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
        <Building2 className="size-4" aria-hidden />
        {job.employer.employerProfile?.companyName}
      </p>
      <p className="mt-3 text-xl font-bold">
        {formatSalary(job.salaryType, job.salaryMin, job.salaryMax)}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-4" aria-hidden />
          {job.prefecture}
          {job.city}
          {job.remoteWork === "FULL"
            ? "（フルリモート）"
            : job.remoteWork === "PARTIAL"
              ? "（一部リモート）"
              : ""}
        </span>
        {job.publishedAt && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Clock className="size-4" aria-hidden />
            {relativeTime(job.publishedAt)}に掲載
          </span>
        )}
      </div>
    </Link>
  );
}
