import { ArrowRight, MessageCircle, PenSquare, Search } from "lucide-react";
import Link from "next/link";
import { CategoryIcon, TONE_BG } from "@/components/board/category-icon";
import { JobCard } from "@/components/board/job-card";
import { SearchForm } from "@/components/board/search-form";
import { buttonVariants } from "@/components/ui/button";
import { JOB_CATEGORIES } from "@/lib/master-data";
import { cn } from "@/lib/utils";
import { latestJobs } from "@/server/domain/job-search";

export const dynamic = "force-dynamic";

export default async function TopPage() {
  const jobs = await latestJobs(6);
  return (
    <div>
      {/* ヒーロー */}
      <section className="border-b-2 border-ink bg-sun-soft">
        <div className="mx-auto grid w-full max-w-[1040px] gap-8 px-4 py-12 md:grid-cols-[1.2fr_1fr] md:items-center md:py-16">
          <div className="space-y-5">
            <p className="inline-block -rotate-2 rounded-full border-2 border-ink bg-coral px-3 py-1 text-sm font-bold text-[#1e1b2e] shadow-pop-sm">
              登録も、求人を出すのも、ぜんぶ無料
            </p>
            <h1 className="text-3xl leading-tight font-bold sm:text-5xl">
              気軽に、あかるく、
              <br />
              まっすぐ。
              <br />
              <span className="bg-sun px-1">仕事と人の掲示板</span>
            </h1>
            <p className="leading-8">
              Axis
              は、仕事をさがす人と、人をさがす企業・お店が、掲示板みたいに気軽に出会える場所。見るだけならログインもいりません。
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/jobs" className={buttonVariants({ size: "lg" })}>
                <Search /> 仕事をさがす
              </Link>
              <Link
                href="/signup?as=employer"
                className={buttonVariants({ size: "lg", variant: "outline" })}
              >
                <PenSquare /> 求人を出す
              </Link>
            </div>
          </div>
          {/* 付箋のイラスト */}
          <div aria-hidden className="relative hidden h-72 md:block">
            <div className="pop-card absolute top-2 left-6 w-56 -rotate-6 bg-mint p-4 text-[#1e1b2e]">
              <p className="text-xs font-bold">さがしています</p>
              <p className="mt-1 font-bold">平日の昼に、接客のお仕事</p>
            </div>
            <div className="pop-card absolute top-24 right-2 w-56 rotate-3 bg-card p-4">
              <p className="text-xs font-bold">募集中</p>
              <p className="mt-1 font-bold">カフェのホールスタッフ</p>
              <p className="mt-1 text-lg font-bold">時給 1,300円〜</p>
            </div>
            <div className="pop-card absolute bottom-0 left-16 flex w-48 -rotate-2 items-center gap-2 bg-sky-pop p-3 text-[#1e1b2e]">
              <MessageCircle className="size-5" />
              <p className="text-sm font-bold">「見学できますか？」</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1040px] space-y-12 px-4 py-10">
        <SearchForm params={{}} compact />

        <section>
          <h2 className="mb-4 text-xl font-bold">職種からさがす</h2>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-7">
            {Object.entries(JOB_CATEGORIES).map(([key, c]) => (
              <li key={key}>
                <Link
                  href={`/jobs?category=${key}`}
                  className="pop-card pop-press flex flex-col items-center gap-1.5 p-2 text-center text-xs font-bold sm:gap-2 sm:p-3 sm:text-sm"
                >
                  <span
                    className={cn(
                      "inline-flex size-12 items-center justify-center rounded-full border-2 border-ink text-[#1e1b2e]",
                      TONE_BG[c.tone],
                    )}
                  >
                    <CategoryIcon category={key} className="size-6" />
                  </span>
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-bold">新着の求人</h2>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-1 text-sm font-bold text-link underline"
            >
              すべて見る <ArrowRight className="size-4" />
            </Link>
          </div>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ求人がありません。</p>
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

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "見るだけなら登録なし",
              body: "求人はだれでも見られます。気になったら、そのとき登録すればOK。",
              tone: "bg-sun",
            },
            {
              title: "メッセージで気軽に",
              body: "応募の前に質問もできます。企業から声がかかることも。",
              tone: "bg-mint",
            },
            {
              title: "安心して使える",
              body: "求人には法律で必要な条件を必ず書いてもらいます。困ったら通報・相談もできます。",
              tone: "bg-sky-pop",
            },
          ].map((f) => (
            <div key={f.title} className="pop-card p-5">
              <span
                className={cn(
                  "inline-block rounded-full border-2 border-ink px-3 text-sm font-bold text-[#1e1b2e]",
                  f.tone,
                )}
              >
                POINT
              </span>
              <h3 className="mt-3 text-lg font-bold">{f.title}</h3>
              <p className="mt-1 text-sm leading-7">{f.body}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
