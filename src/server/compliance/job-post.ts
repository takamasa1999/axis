import { z } from "zod";
import {
  AGE_EXCEPTION_REASONS,
  EMPLOYMENT_TYPES,
  INSURANCES,
  JOB_CATEGORIES,
  PREFECTURES,
  SMOKING_MEASURES,
} from "@/lib/master-data";
import { checkAgeWording, checkGender, type TermHit } from "./text-checks";

/**
 * 求人の掲載ルール（T019 / contracts/compliance-rules.md §1〜§3, §5）。
 * 画面の入力チェック・サーバーの検証・テストで同じ定義を使う。
 */

const text = (max: number) => z.string().trim().max(max);
const keys = <T extends Record<string, unknown>>(o: T) =>
  Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

/** 下書きとして保存できる内容（未入力があってもよい） */
export const JobDraftSchema = z.object({
  title: text(60).default(""),
  category: z.enum(keys(JOB_CATEGORIES)).nullish(),
  employmentType: z.enum(keys(EMPLOYMENT_TYPES)).nullish(),
  jobDescription: text(3000).nullish(),
  jobChangeScope: text(500).nullish(),
  contractType: z.enum(["INDEFINITE", "FIXED_TERM"]).nullish(),
  contractTermText: text(200).nullish(),
  renewalPolicy: z.enum(["RENEWABLE", "CONDITIONAL", "NOT_RENEWABLE"]).nullish(),
  renewalCapText: text(200).nullish(),
  trialPeriodText: text(200).nullish(),
  prefecture: z.enum(PREFECTURES).nullish(),
  city: text(50).nullish(),
  addressDetail: text(200).nullish(),
  remoteWork: z.enum(["NONE", "PARTIAL", "FULL"]).default("NONE"),
  locationChangeScope: text(500).nullish(),
  workHoursText: text(500).nullish(),
  overtime: z.enum(["NONE", "EXISTS"]).nullish(),
  overtimeText: text(300).nullish(),
  breakText: text(300).nullish(),
  holidaysText: text(500).nullish(),
  salaryType: z.enum(["HOURLY", "DAILY", "MONTHLY", "ANNUAL"]).nullish(),
  salaryMin: z.number().int().min(0).max(100_000_000).nullish(),
  salaryMax: z.number().int().min(0).max(100_000_000).nullish(),
  salaryNote: text(1000).nullish(),
  fixedOvertimePay: z.boolean().default(false),
  insurance: z.array(z.enum(keys(INSURANCES))).default([]),
  smokingMeasure: z.enum(keys(SMOKING_MEASURES)).nullish(),
  smokingText: text(300).nullish(),
  ageMin: z.number().int().min(15).max(100).nullish(),
  ageMax: z.number().int().min(15).max(100).nullish(),
  ageExceptionReason: z.enum(keys(AGE_EXCEPTION_REASONS)).nullish(),
});
export type JobDraft = z.infer<typeof JobDraftSchema>;

/** 画面に出す項目名（足りない項目の一覧で使う） */
export const JOB_FIELD_LABEL: Record<string, string> = {
  title: "求人のタイトル",
  category: "職種",
  employmentType: "雇用形態",
  jobDescription: "仕事の内容",
  jobChangeScope: "将来、仕事の内容が変わる可能性（変更の範囲）",
  contractType: "契約期間の定め",
  contractTermText: "契約期間",
  renewalPolicy: "契約の更新の有無",
  renewalCapText: "契約の更新の上限",
  trialPeriodText: "試用期間",
  prefecture: "働く場所（都道府県）",
  city: "働く場所（市区町村）",
  locationChangeScope: "将来、働く場所が変わる可能性（変更の範囲）",
  workHoursText: "始業・終業の時刻",
  overtime: "残業（時間外労働）の有無",
  overtimeText: "残業の目安",
  breakText: "休憩",
  holidaysText: "休日",
  salaryType: "給与の種類",
  salaryMin: "給与（下限）",
  salaryMax: "給与（上限）",
  salaryNote: "給与の補足（固定残業代の内訳など）",
  insurance: "加入する保険",
  smokingMeasure: "受動喫煙を防ぐための措置",
  ageExceptionReason: "年齢の条件の理由",
  confirmations: "掲載前の確認事項",
};

export type Issue = { field: string; message: string };

export type PublishConfirmations = { truthful: boolean; lawful: boolean; noLaborDispute: boolean };

const filled = (v: unknown) =>
  typeof v === "string" ? v.trim().length > 0 : v !== null && v !== undefined;

/**
 * 公開できるかを確かめる（§1〜§3）。問題がなければ空の配列を返す。
 * 「止める」ものだけを返す。性別を連想させる職種名などの注意は jobWarnings で別に返す。
 */
export function validateForPublish(job: JobDraft, confirmations?: PublishConfirmations): Issue[] {
  const issues: Issue[] = [];
  const need = (field: keyof JobDraft, message?: string) => {
    if (!filled(job[field]))
      issues.push({ field, message: message ?? `${JOB_FIELD_LABEL[field]}を入れてください` });
  };

  // §1 必須の労働条件（職業安定法第5条の3・同施行規則）
  need("title");
  need("category");
  need("employmentType");
  need("jobDescription");
  need(
    "jobChangeScope",
    "将来、仕事の内容が変わる可能性を入れてください（変わらない場合は「変更なし」）",
  );
  need("contractType");
  if (job.contractType === "FIXED_TERM") {
    need("contractTermText");
    need("renewalPolicy");
    need("renewalCapText", "契約の更新の上限を入れてください（上限がない場合は「なし」）");
  }
  need("trialPeriodText", "試用期間を入れてください（ない場合は「なし」）");
  need("prefecture");
  need("city");
  need(
    "locationChangeScope",
    "将来、働く場所が変わる可能性を入れてください（変わらない場合は「変更なし」）",
  );
  need("workHoursText");
  need("overtime");
  if (job.overtime === "EXISTS") need("overtimeText");
  need("breakText");
  need("holidaysText");
  need("salaryType");
  if (!job.salaryMin || job.salaryMin <= 0)
    issues.push({ field: "salaryMin", message: "給与の下限を入れてください" });
  if (job.salaryMin && job.salaryMax && job.salaryMax < job.salaryMin) {
    issues.push({
      field: "salaryMax",
      message: "給与の下限が上限より大きくなっています。金額を見直してください",
    });
  }
  if (job.fixedOvertimePay && !filled(job.salaryNote)) {
    issues.push({
      field: "salaryNote",
      message: "固定残業代がある場合は、時間数・金額・超えた分を追加で支払うことを書いてください",
    });
  }
  need("smokingMeasure");

  // §2 性別を限定する表現
  const allText = textOf(job);
  for (const hit of checkGender(allText).blocking) {
    issues.push({
      field: "gender",
      message: `「${hit.term}」は法律で使えない表現です。「${hit.suggestion}」などに言い換えてください`,
    });
  }

  // §3 年齢の条件は例外理由があるときだけ
  const hasAgeLimit = job.ageMin != null || job.ageMax != null;
  if (hasAgeLimit && !job.ageExceptionReason) {
    issues.push({
      field: "ageExceptionReason",
      message: "年齢の条件を入れるときは、法令の例外理由を選んでください",
    });
  }
  if (job.ageMin != null && job.ageMax != null && job.ageMin > job.ageMax) {
    issues.push({ field: "ageMax", message: "年齢の下限が上限より大きくなっています" });
  }
  if (!job.ageExceptionReason) {
    for (const label of checkAgeWording(allText)) {
      issues.push({
        field: "ageWording",
        message: `年齢を限定する表現（${label}）があります。法令の例外理由がない場合は削除してください`,
      });
    }
  }

  // 掲載前の確認事項（FR-013）
  if (
    confirmations &&
    !(confirmations.truthful && confirmations.lawful && confirmations.noLaborDispute)
  ) {
    issues.push({
      field: "confirmations",
      message: "掲載前の確認事項にすべてチェックしてください",
    });
  }
  return issues;
}

/** 公開を止めない注意（言い換えの提案） */
export function jobWarnings(job: JobDraft): TermHit[] {
  return checkGender(textOf(job)).warnings;
}

function textOf(job: JobDraft) {
  return [
    job.title,
    job.jobDescription,
    job.jobChangeScope,
    job.workHoursText,
    job.holidaysText,
    job.salaryNote,
    job.overtimeText,
    job.breakText,
  ]
    .filter(Boolean)
    .join("\n");
}

/** §5 応募者に知らせる「労働条件」の項目 */
export const LABOR_CONDITION_FIELDS = [
  "jobDescription",
  "jobChangeScope",
  "employmentType",
  "contractType",
  "contractTermText",
  "renewalPolicy",
  "renewalCapText",
  "trialPeriodText",
  "prefecture",
  "city",
  "addressDetail",
  "locationChangeScope",
  "remoteWork",
  "workHoursText",
  "overtime",
  "overtimeText",
  "breakText",
  "holidaysText",
  "salaryType",
  "salaryMin",
  "salaryMax",
  "salaryNote",
  "fixedOvertimePay",
  "insurance",
  "smokingMeasure",
  "smokingText",
] as const satisfies readonly (keyof JobDraft)[];

/** 2つの版のあいだで変わった項目（すべての項目）と、そのうちの労働条件 */
export function diffJob(prev: Partial<JobDraft>, next: Partial<JobDraft>) {
  const all = Object.keys({ ...prev, ...next }) as (keyof JobDraft)[];
  const changed = all.filter(
    (k) => JSON.stringify(prev[k] ?? null) !== JSON.stringify(next[k] ?? null),
  );
  const laborChanged = changed.filter((k) =>
    (LABOR_CONDITION_FIELDS as readonly string[]).includes(k),
  );
  return { changed, laborChanged };
}
