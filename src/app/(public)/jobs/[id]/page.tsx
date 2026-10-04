import { Building2, CalendarDays, MapPin, MessageCircleQuestion, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CategoryChip } from "@/components/board/category-icon";
import { ReportDialog } from "@/components/board/report-dialog";
import { buttonVariants } from "@/components/ui/button";
import { employmentLabel, formatDate, formatSalary } from "@/lib/format";
import {
  AGE_EXCEPTION_REASONS,
  CONTRACT_TYPES,
  INSURANCES,
  type Insurance,
  OVERTIME,
  REMOTE_WORK,
  RENEWAL_POLICIES,
  SMOKING_MEASURES,
} from "@/lib/master-data";
import { getOptionalUser } from "@/server/auth/guards";
import { getPublicJob } from "@/server/domain/job-post";

const GOOGLE_EMPLOYMENT: Record<string, string> = {
  FULL_TIME: "FULL_TIME",
  CONTRACT: "TEMPORARY",
  PART_TIME: "PART_TIME",
  DISPATCH: "TEMPORARY",
};
const GOOGLE_UNIT: Record<string, string> = {
  HOURLY: "HOUR",
  DAILY: "DAY",
  MONTHLY: "MONTH",
  ANNUAL: "YEAR",
};

export async function generateMetadata(props: PageProps<"/jobs/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const data = await getPublicJob(id);
  if (!data) return { title: "求人が見つかりません | Axis" };
  const { job } = data;
  const company = job.employer.employerProfile?.companyName ?? "";
  const description = `${company}｜${formatSalary(job.salaryType, job.salaryMin, job.salaryMax)}｜${job.prefecture ?? ""}${job.city ?? ""}｜${(job.jobDescription ?? "").slice(0, 80)}`;
  return {
    title: `${job.title}（${company}）| Axis`,
    description,
    openGraph: { title: `${job.title}（${company}）`, description },
    robots: data.open ? undefined : { index: false },
  };
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b-2 border-dashed border-ink/20 py-3 last:border-b-0 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm font-bold text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap leading-7">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pop-card p-5 sm:p-6">
      <h2 className="mb-2 text-lg font-bold">{title}</h2>
      <dl>{children}</dl>
    </section>
  );
}

export default async function JobDetailPage(props: PageProps<"/jobs/[id]">) {
  const { id } = await props.params;
  const [data, user] = await Promise.all([getPublicJob(id), getOptionalUser()]);
  if (!data) notFound();
  const { job, open } = data;
  const company = job.employer.employerProfile;
  const isOwner = user?.userId === job.employerId;

  // Google の求人検索用の構造化データ（research R8）。掲載終了した求人では出さない
  const jsonLd = open
    ? {
        "@context": "https://schema.org/",
        "@type": "JobPosting",
        title: job.title,
        description: job.jobDescription,
        datePosted: job.publishedAt?.toISOString(),
        validThrough: job.expiresAt?.toISOString(),
        employmentType: job.employmentType ? GOOGLE_EMPLOYMENT[job.employmentType] : undefined,
        hiringOrganization: {
          "@type": "Organization",
          name: company?.companyName,
          sameAs: company?.websiteUrl ?? undefined,
        },
        jobLocation: {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressRegion: job.prefecture,
            addressLocality: job.city,
            addressCountry: "JP",
          },
        },
        jobLocationType: job.remoteWork === "FULL" ? "TELECOMMUTE" : undefined,
        baseSalary: job.salaryType
          ? {
              "@type": "MonetaryAmount",
              currency: "JPY",
              value: {
                "@type": "QuantitativeValue",
                minValue: job.salaryMin,
                maxValue: job.salaryMax ?? undefined,
                unitText: GOOGLE_UNIT[job.salaryType],
              },
            }
          : undefined,
      }
    : null;

  const applyHref =
    user?.kind === "PERSON"
      ? `/jobs/${job.id}/apply`
      : `/signup?as=seeker&next=${encodeURIComponent(`/jobs/${job.id}/apply`)}`;
  const askHref =
    user?.kind === "PERSON"
      ? `/jobs/${job.id}/apply?mode=question`
      : `/signup?as=seeker&next=${encodeURIComponent(`/jobs/${job.id}/apply?mode=question`)}`;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8">
      {jsonLd && (
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: 構造化データ（JSON）。< をエスケープして埋め込む
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}

      {!open && <p className="pop-card bg-subtle p-4 font-bold">この求人の募集は終了しました。</p>}

      <header className="pop-card space-y-3 p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryChip category={job.category} />
          <span className="rounded-full border-2 border-ink bg-card px-2.5 text-xs leading-6 font-bold">
            {employmentLabel(job.employmentType)}
          </span>
          {job.employmentType === "DISPATCH" && (
            <span className="rounded-full bg-ink px-2.5 text-xs leading-6 font-bold text-paper">
              派遣の求人です
            </span>
          )}
        </div>
        <h1 className="text-2xl leading-snug font-bold sm:text-3xl">{job.title}</h1>
        <Link
          href={`/companies/${job.employerId}`}
          className="inline-flex items-center gap-1 font-bold underline"
        >
          <Building2 className="size-4" aria-hidden />
          {company?.companyName}
        </Link>
        <p className="text-2xl font-bold">
          {formatSalary(job.salaryType, job.salaryMin, job.salaryMax)}
        </p>
        <p className="flex items-center gap-1">
          <MapPin className="size-4" aria-hidden />
          {job.prefecture}
          {job.city}
          {job.addressDetail ? ` ${job.addressDetail}` : ""}（{REMOTE_WORK[job.remoteWork]}）
        </p>
        <p className="flex flex-wrap items-center gap-x-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-4" aria-hidden />
            掲載日 {formatDate(job.publishedAt)}
          </span>
          <span>最終更新日 {formatDate(job.contentUpdatedAt ?? job.publishedAt)}</span>
          {open && job.expiresAt && <span>{formatDate(job.expiresAt)}まで掲載</span>}
        </p>
        {open && !isOwner && user?.kind !== "EMPLOYER" && (
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href={applyHref as "/"} className={buttonVariants({ size: "lg" })}>
              <Send /> 応募する
            </Link>
            <Link
              href={askHref as "/"}
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              <MessageCircleQuestion /> 質問してみる
            </Link>
          </div>
        )}
        {isOwner && (
          <Link
            href={`/employer/jobs/${job.id}/edit`}
            className={buttonVariants({ variant: "outline" })}
          >
            この求人を編集する
          </Link>
        )}
      </header>

      <Section title="仕事の内容">
        <Row label="仕事の内容">{job.jobDescription}</Row>
        <Row label="将来、仕事の内容が変わる可能性">{job.jobChangeScope}</Row>
      </Section>

      <Section title="雇用形態・契約">
        <Row label="雇用形態">{employmentLabel(job.employmentType)}</Row>
        <Row label="契約期間">
          {job.contractType ? CONTRACT_TYPES[job.contractType] : ""}
          {job.contractType === "FIXED_TERM" && (
            <>
              {"\n"}期間：{job.contractTermText}
              {"\n"}更新：{job.renewalPolicy ? RENEWAL_POLICIES[job.renewalPolicy] : ""}
              {"\n"}更新の上限：{job.renewalCapText}
            </>
          )}
        </Row>
        <Row label="試用期間">{job.trialPeriodText}</Row>
      </Section>

      <Section title="働く場所">
        <Row label="住所">
          {job.prefecture}
          {job.city}
          {job.addressDetail ? `\n${job.addressDetail}` : ""}
        </Row>
        <Row label="リモートワーク">{REMOTE_WORK[job.remoteWork]}</Row>
        <Row label="将来、働く場所が変わる可能性">{job.locationChangeScope}</Row>
      </Section>

      <Section title="時間と休み">
        <Row label="働く時間">{job.workHoursText}</Row>
        <Row label="残業">
          {job.overtime ? OVERTIME[job.overtime] : ""}
          {job.overtimeText ? `（${job.overtimeText}）` : ""}
        </Row>
        <Row label="休憩">{job.breakText}</Row>
        <Row label="休日">{job.holidaysText}</Row>
      </Section>

      <Section title="給与・保険">
        <Row label="給与">{formatSalary(job.salaryType, job.salaryMin, job.salaryMax)}</Row>
        {job.fixedOvertimePay && (
          <Row label="固定残業代">あり（内訳は下の補足を確認してください）</Row>
        )}
        {job.salaryNote && <Row label="給与の補足">{job.salaryNote}</Row>}
        <Row label="加入する保険">
          {job.insurance.length > 0
            ? job.insurance.map((i) => INSURANCES[i as Insurance]).join("・")
            : "なし"}
        </Row>
        <Row label="受動喫煙を防ぐための措置">
          {job.smokingMeasure ? SMOKING_MEASURES[job.smokingMeasure] : ""}
          {job.smokingText ? `（${job.smokingText}）` : ""}
        </Row>
      </Section>

      {(job.ageMin != null || job.ageMax != null) && job.ageExceptionReason && (
        <Section title="年齢の条件">
          <Row label="条件">
            {job.ageMin ?? ""}
            {job.ageMin != null ? "歳以上" : ""}
            {job.ageMax != null ? ` ${job.ageMax}歳以下` : ""}
          </Row>
          <Row label="理由">{AGE_EXCEPTION_REASONS[job.ageExceptionReason]}</Row>
        </Section>
      )}

      <Section title="募集する企業">
        <Row label="企業名">{company?.companyName}</Row>
        <Row label="所在地">
          {company?.prefecture}
          {company?.address}
        </Row>
        <Row label="どんな会社・お店か">{company?.businessDescription}</Row>
      </Section>

      <div className="flex justify-end">
        {user && !isOwner ? (
          <ReportDialog targetType="JOB_POST" targetId={job.id} label="この求人を運営に知らせる" />
        ) : null}
      </div>
    </div>
  );
}
