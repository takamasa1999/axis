import { type JobDraft, JobDraftSchema } from "@/server/compliance/job-post";

/** 必須項目をすべて埋めた求人 */
export function completeJob(overrides: Partial<JobDraft> = {}): JobDraft {
  return JobDraftSchema.parse({
    title: "カフェのホールスタッフ",
    category: "FOOD",
    employmentType: "PART_TIME",
    jobDescription: "ドリンクの提供と接客をお願いします。",
    jobChangeScope: "変更なし",
    contractType: "INDEFINITE",
    trialPeriodText: "なし",
    prefecture: "東京都",
    city: "渋谷区",
    locationChangeScope: "変更なし",
    workHoursText: "10:00〜18:00 のうち4時間〜（シフト制）",
    overtime: "NONE",
    breakText: "6時間を超える場合は45分",
    holidaysText: "シフト制（週2日〜）",
    salaryType: "HOURLY",
    salaryMin: 1300,
    insurance: ["WORKERS_COMP"],
    smokingMeasure: "NO_SMOKING_INDOOR",
    ...overrides,
  });
}
