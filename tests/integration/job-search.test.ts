/**
 * 求人の検索の結合テスト（T034 / FR-017〜FR-019）
 */
import { beforeEach, describe, expect, it } from "vitest";
import { publishJob, saveJob } from "@/server/domain/job-post";
import { effectiveSort, parseSearchParams, searchJobs } from "@/server/domain/job-search";
import { db, resetDb } from "../helpers/db";
import { createEmployer } from "../helpers/factories";
import { completeJob } from "../helpers/job-fixtures";

const ok = { truthful: true, lawful: true, noLaborDispute: true };

async function publish(actor: Awaited<ReturnType<typeof createEmployer>>["actor"], overrides = {}) {
  const { jobId } = await saveJob(actor, null, completeJob(overrides));
  await publishJob(actor, jobId, ok);
  return jobId;
}

describe("求人の検索", () => {
  beforeEach(resetDb);

  it("公開中で期限内の求人だけが出る", async () => {
    const { actor } = await createEmployer();
    const open = await publish(actor, { title: "公開中" });
    const expired = await publish(actor, { title: "期限切れ" });
    await db.jobPost.update({
      where: { id: expired },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await saveJob(actor, null, completeJob({ title: "下書き" }));
    const { jobs } = await searchJobs({} as never);
    expect(jobs.map((j) => j.id)).toEqual([open]);
  });

  it("職種・勤務地・雇用形態・キーワードで絞り込める", async () => {
    const { actor } = await createEmployer("ひだまりカフェ");
    const cafe = await publish(actor, {
      title: "ホール",
      category: "FOOD",
      prefecture: "東京都",
      employmentType: "PART_TIME",
    });
    await publish(actor, {
      title: "エンジニア",
      category: "IT",
      prefecture: "大阪府",
      employmentType: "FULL_TIME",
    });
    expect(
      (await searchJobs(parseSearchParams({ category: "FOOD" }))).jobs.map((j) => j.id),
    ).toEqual([cafe]);
    expect(
      (await searchJobs(parseSearchParams({ prefecture: "東京都" }))).jobs.map((j) => j.id),
    ).toEqual([cafe]);
    expect(
      (await searchJobs(parseSearchParams({ type: "PART_TIME" }))).jobs.map((j) => j.id),
    ).toEqual([cafe]);
    expect((await searchJobs(parseSearchParams({ q: "ひだまり" }))).total).toBe(2);
    expect((await searchJobs(parseSearchParams({ q: "エンジニア" }))).total).toBe(1);
  });

  it("給与の高い順は、給与の種類を選んだときだけ使える", async () => {
    const { actor } = await createEmployer();
    const low = await publish(actor, { salaryType: "HOURLY", salaryMin: 1100 });
    const high = await publish(actor, { salaryType: "HOURLY", salaryMin: 1600 });
    expect(effectiveSort(parseSearchParams({ sort: "SALARY_DESC" }))).toBe("NEWEST");
    const sorted = await searchJobs(
      parseSearchParams({ sort: "SALARY_DESC", salaryType: "HOURLY" }),
    );
    expect(sorted.jobs.map((j) => j.id)).toEqual([high, low]);
  });

  it("不正な検索条件は無視する", () => {
    expect(parseSearchParams({ category: "HACK", prefecture: "火星", page: "-1" })).toMatchObject({
      category: undefined,
      prefecture: undefined,
      page: undefined,
    });
  });
});
