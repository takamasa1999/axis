/**
 * 掲載ルールの単体テスト（T020 / contracts/compliance-rules.md）
 */
import { describe, expect, it } from "vitest";
import {
  diffJob,
  type JobDraft,
  jobWarnings,
  validateForPublish,
} from "@/server/compliance/job-post";
import { checkAgeWording, checkContactInfo, checkGender } from "@/server/compliance/text-checks";
import { completeJob } from "../helpers/job-fixtures";

const ok = { truthful: true, lawful: true, noLaborDispute: true };
const fields = (job: JobDraft, c = ok) => validateForPublish(job, c).map((i) => i.field);

describe("§1 必須の労働条件", () => {
  it("すべて埋まっていれば公開できる", () => {
    expect(validateForPublish(completeJob(), ok)).toEqual([]);
  });

  it.each([
    "jobDescription",
    "jobChangeScope",
    "trialPeriodText",
    "prefecture",
    "city",
    "locationChangeScope",
    "workHoursText",
    "overtime",
    "breakText",
    "holidaysText",
    "salaryType",
    "smokingMeasure",
    "employmentType",
  ] as const)("%s が空なら公開できない", (field) => {
    expect(fields(completeJob({ [field]: null }))).toContain(field);
  });

  it("有期契約なら期間・更新の有無・更新の上限が必須", () => {
    expect(fields(completeJob({ contractType: "FIXED_TERM" }))).toEqual(
      expect.arrayContaining(["contractTermText", "renewalPolicy", "renewalCapText"]),
    );
  });

  it("残業ありなら目安の説明が必須", () => {
    expect(fields(completeJob({ overtime: "EXISTS" }))).toContain("overtimeText");
  });

  it("給与の下限が上限より大きいと公開できない", () => {
    expect(fields(completeJob({ salaryMin: 2000, salaryMax: 1500 }))).toContain("salaryMax");
  });

  it("固定残業代ありなら補足が必須", () => {
    expect(fields(completeJob({ fixedOvertimePay: true }))).toContain("salaryNote");
  });

  it("確認事項にひとつでもチェックがないと公開できない", () => {
    expect(fields(completeJob(), { ...ok, noLaborDispute: false })).toContain("confirmations");
  });
});

describe("§2 性別を限定する表現", () => {
  it("「女性歓迎」は公開を止める", () => {
    const issues = validateForPublish(completeJob({ jobDescription: "女性歓迎の職場です" }), ok);
    expect(issues.map((i) => i.field)).toContain("gender");
    expect(issues[0].message).toContain("どなたでも歓迎");
  });

  it("全角・空白が混じっても検出する", () => {
    expect(checkGender("男性　限定").blocking).toHaveLength(1);
  });

  it("「ウェイトレス」は注意だけで、公開は止めない", () => {
    const job = completeJob({ title: "ウェイトレス募集" });
    expect(validateForPublish(job, ok)).toEqual([]);
    expect(jobWarnings(job).map((w) => w.suggestion)).toContain("ホールスタッフ");
  });
});

describe("§3 年齢の条件", () => {
  it("年齢の条件を入れるなら例外理由が必須", () => {
    expect(fields(completeJob({ ageMax: 35 }))).toContain("ageExceptionReason");
    expect(fields(completeJob({ ageMax: 35, ageExceptionReason: "YOUTH_CAREER" }))).toEqual([]);
  });

  it("本文の「35歳まで」は、例外理由がなければ公開を止める", () => {
    expect(fields(completeJob({ jobDescription: "35歳までの方を募集" }))).toContain("ageWording");
    expect(checkAgeWording("20〜30歳の方")).toHaveLength(1);
    expect(checkAgeWording("年齢不問・未経験歓迎")).toHaveLength(0);
  });
});

describe("§4 連絡先の検出", () => {
  it("メールアドレス・電話番号・外部の連絡手段を検出する", () => {
    expect(checkContactInfo("連絡は taro@example.com まで")).toContain("EMAIL");
    expect(checkContactInfo("０９０−１２３４−５６７８")).toContain("PHONE");
    expect(checkContactInfo("LINE ID教えます")).toContain("EXTERNAL");
    expect(checkContactInfo("週3日、1日4時間から働けます")).toEqual([]);
  });
});

describe("§5 労働条件の変更の判定", () => {
  it("賃金が変われば労働条件の変更、タイトルだけなら変更ではない", () => {
    const a = completeJob();
    expect(diffJob(a, { ...a, salaryMin: 1400 }).laborChanged).toEqual(["salaryMin"]);
    expect(diffJob(a, { ...a, title: "新しいタイトル" }).laborChanged).toEqual([]);
  });
});
