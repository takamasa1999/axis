"use client";

import { AlertTriangle, Check, ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { publishJobAction, saveJobAction } from "@/app/(employer)/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatSalary } from "@/lib/format";
import {
  AGE_EXCEPTION_REASONS,
  EMPLOYMENT_TYPES,
  INSURANCES,
  JOB_CATEGORIES,
  PREFECTURES,
  RENEWAL_POLICIES,
  SALARY_TYPES,
  SMOKING_MEASURES,
} from "@/lib/master-data";
import { cn } from "@/lib/utils";
import {
  type Issue,
  type JobDraft,
  jobWarnings,
  validateForPublish,
} from "@/server/compliance/job-post";
import { FormField, Select } from "./form-field";

/**
 * 求人の作成・編集（T032 / FR-009〜FR-014）。
 * ステップ：①仕事の内容 ②働く場所 ③時間と休み ④給与と保険 ⑤確認して公開
 * 法令で必要な項目は、例と短い説明を添えて、やさしい言葉で聞く（原則VIII・FR-048）。
 */

const STEPS = ["仕事の内容", "働く場所", "時間と休み", "給与と保険", "確認して公開"] as const;

/** どの項目がどのステップにあるか（足りない項目の一覧から戻れるように） */
const FIELD_STEP: Record<string, number> = {
  title: 0,
  category: 0,
  employmentType: 0,
  jobDescription: 0,
  jobChangeScope: 0,
  gender: 0,
  ageWording: 0,
  prefecture: 1,
  city: 1,
  locationChangeScope: 1,
  contractType: 2,
  contractTermText: 2,
  renewalPolicy: 2,
  renewalCapText: 2,
  trialPeriodText: 2,
  workHoursText: 2,
  overtime: 2,
  overtimeText: 2,
  breakText: 2,
  holidaysText: 2,
  salaryType: 3,
  salaryMin: 3,
  salaryMax: 3,
  salaryNote: 3,
  insurance: 3,
  smokingMeasure: 3,
  ageExceptionReason: 3,
  confirmations: 4,
};

type Props = {
  jobId: string | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "EXPIRED" | "HIDDEN";
  initial: JobDraft;
};

export function JobEditor({ jobId: initialJobId, status, initial }: Props) {
  const router = useRouter();
  const [jobId, setJobId] = useState(initialJobId);
  const [step, setStep] = useState(0);
  const [d, setD] = useState<JobDraft>(initial);
  const [showAge, setShowAge] = useState(initial.ageMin != null || initial.ageMax != null);
  const [confirm, setConfirm] = useState({ truthful: false, lawful: false, noLaborDispute: false });
  const [serverIssues, setServerIssues] = useState<Issue[]>([]);
  const [pending, startTransition] = useTransition();
  const isPublished = status === "PUBLISHED";
  // 入力を始めたばかりの人に「必須です」を並べないよう、最後のステップを一度見るまでは項目ごとのエラーを出さない
  const [reviewed, setReviewed] = useState(initialJobId !== null && status !== "DRAFT");

  // ステップを変えたら、画面のいちばん上に戻す
  useEffect(() => {
    if (step >= 0) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const issues = useMemo(() => validateForPublish(d), [d]);
  const warnings = useMemo(() => jobWarnings(d), [d]);
  const errorOf = (field: string) =>
    [...serverIssues, ...(reviewed ? issues : [])].find((i) => i.field === field)?.message;
  const stepHasIssue = (s: number) => issues.some((i) => FIELD_STEP[i.field] === s);

  const set = <K extends keyof JobDraft>(key: K, value: JobDraft[K]) =>
    setD((p) => ({ ...p, [key]: value }));
  const text = (key: keyof JobDraft) => ({
    id: key,
    value: (d[key] as string | null | undefined) ?? "",
    onChange: (e: { target: { value: string } }) => set(key, (e.target.value || null) as never),
  });
  const num = (key: "salaryMin" | "salaryMax" | "ageMin" | "ageMax") => ({
    id: key,
    inputMode: "numeric" as const,
    value: d[key] ?? "",
    onChange: (e: { target: { value: string } }) => {
      const n = Number(e.target.value.replace(/[^\d]/g, ""));
      set(key, e.target.value === "" || Number.isNaN(n) ? null : n);
    },
  });

  /** 下書きの保存（公開中の求人は、最後のステップでまとめて保存する） */
  async function saveDraft(): Promise<string | null> {
    const payload = {
      ...d,
      ...(showAge ? {} : { ageMin: null, ageMax: null, ageExceptionReason: null }),
    };
    const result = await saveJobAction({ jobId, draft: payload as Record<string, unknown> });
    if (!result.ok) {
      setServerIssues(result.error.issues ?? []);
      toast.error(result.error.message);
      return null;
    }
    if (!jobId) {
      setJobId(result.data.jobId);
      // ページを作り直さずに URL だけ変える（入力中のステップを保つ）
      window.history.replaceState(null, "", `/employer/jobs/${result.data.jobId}/edit`);
    }
    if (result.data.notifiedApplicants > 0) {
      toast.info(`労働条件の変更を、応募者 ${result.data.notifiedApplicants} 人に知らせました`);
    }
    return result.data.jobId;
  }

  function go(next: number) {
    if (next === 4) setReviewed(true);
    if (isPublished) {
      setStep(next);
      return;
    }
    startTransition(async () => {
      if (await saveDraft()) setStep(next);
    });
  }

  function publish() {
    startTransition(async () => {
      const id = await saveDraft();
      if (!id) return;
      if (isPublished) {
        toast.success("変更を保存しました");
        router.push("/employer/jobs");
        return;
      }
      const result = await publishJobAction({ jobId: id, confirmations: confirm });
      if (result.ok) {
        toast.success("求人を公開しました！");
        router.push(`/jobs/${id}`);
      } else {
        setServerIssues(result.error.issues ?? []);
        toast.error(result.error.message);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* ステップの表示 */}
      <ol className="grid grid-cols-5 gap-1 text-center text-[11px] font-bold sm:text-sm">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => go(i)}
              aria-current={step === i ? "step" : undefined}
              className={cn(
                "flex w-full flex-col items-center gap-1 rounded-xl border-2 border-ink px-1 py-2",
                step === i ? "bg-sun text-[#1e1b2e] shadow-pop-sm" : "bg-card",
              )}
            >
              <span className="inline-flex size-6 items-center justify-center rounded-full border-2 border-ink bg-card text-xs text-foreground">
                {stepHasIssue(i) || i === 4 ? (
                  i + 1
                ) : (
                  <Check className="size-3.5" aria-label="入力済み" />
                )}
              </span>
              <span className="leading-tight">{label}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="pop-card space-y-6 p-5 sm:p-7">
        {step === 0 && (
          <>
            <FormField
              id="title"
              label="求人のタイトル"
              required
              hint="例：カフェのホールスタッフ（未経験OK）"
              error={errorOf("title")}
            >
              <Input {...text("title")} maxLength={60} />
            </FormField>
            <FormField id="category" label="職種" required error={errorOf("category")}>
              <Select {...text("category")}>
                <option value="">選んでください</option>
                {Object.entries(JOB_CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              id="employmentType"
              label="雇用形態"
              required
              hint="業務委託など、雇用でない募集は載せられません。"
              error={errorOf("employmentType")}
            >
              <Select {...text("employmentType")}>
                <option value="">選んでください</option>
                {Object.entries(EMPLOYMENT_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              id="jobDescription"
              label="仕事の内容"
              required
              hint="どんな仕事をお願いするか、1日の流れなどを具体的に書くと応募が集まりやすくなります。"
              error={errorOf("jobDescription")}
            >
              <Textarea {...text("jobDescription")} maxLength={3000} rows={6} />
            </FormField>
            <FormField
              id="jobChangeScope"
              label="将来、仕事の内容が変わる可能性"
              required
              hint="入社後に、ほかの仕事をお願いする可能性がある範囲を書いてください（法律で明示が必要です）。変わらない場合は「変更なし」。"
              error={errorOf("jobChangeScope")}
            >
              <Input
                {...text("jobChangeScope")}
                maxLength={500}
                placeholder="例：変更なし／会社の定める業務"
              />
            </FormField>
          </>
        )}

        {step === 1 && (
          <>
            <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
              <FormField id="prefecture" label="都道府県" required error={errorOf("prefecture")}>
                <Select {...text("prefecture")}>
                  <option value="">選んでください</option>
                  {PREFECTURES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </Select>
              </FormField>
              <FormField id="city" label="市区町村" required error={errorOf("city")}>
                <Input {...text("city")} maxLength={50} placeholder="例：渋谷区" />
              </FormField>
            </div>
            <FormField id="addressDetail" label="それより細かい場所" hint="任意。最寄り駅など。">
              <Input
                {...text("addressDetail")}
                maxLength={200}
                placeholder="例：渋谷駅から徒歩5分"
              />
            </FormField>
            <FormField id="remoteWork" label="リモートワーク">
              <Select
                id="remoteWork"
                value={d.remoteWork}
                onChange={(e) => set("remoteWork", e.target.value as JobDraft["remoteWork"])}
              >
                <option value="NONE">出社</option>
                <option value="PARTIAL">一部リモート</option>
                <option value="FULL">フルリモート</option>
              </Select>
            </FormField>
            <FormField
              id="locationChangeScope"
              label="将来、働く場所が変わる可能性"
              required
              hint="入社後に、転勤や配属で働く場所が変わる可能性がある範囲を書いてください。変わらない場合は「変更なし」。"
              error={errorOf("locationChangeScope")}
            >
              <Input
                {...text("locationChangeScope")}
                maxLength={500}
                placeholder="例：変更なし／東京都内の当社店舗"
              />
            </FormField>
          </>
        )}

        {step === 2 && (
          <>
            <FormField id="contractType" label="契約期間" required error={errorOf("contractType")}>
              <Select {...text("contractType")}>
                <option value="">選んでください</option>
                <option value="INDEFINITE">期間の定めなし</option>
                <option value="FIXED_TERM">期間の定めあり（有期）</option>
              </Select>
            </FormField>
            {d.contractType === "FIXED_TERM" && (
              <div className="space-y-5 rounded-xl border-2 border-dashed border-ink p-4">
                <FormField
                  id="contractTermText"
                  label="契約の期間"
                  required
                  error={errorOf("contractTermText")}
                >
                  <Input {...text("contractTermText")} maxLength={200} placeholder="例：6か月" />
                </FormField>
                <FormField
                  id="renewalPolicy"
                  label="契約の更新"
                  required
                  error={errorOf("renewalPolicy")}
                >
                  <Select {...text("renewalPolicy")}>
                    <option value="">選んでください</option>
                    {Object.entries(RENEWAL_POLICIES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField
                  id="renewalCapText"
                  label="更新の上限"
                  required
                  hint="上限がない場合は「なし」。"
                  error={errorOf("renewalCapText")}
                >
                  <Input
                    {...text("renewalCapText")}
                    maxLength={200}
                    placeholder="例：通算5年まで／なし"
                  />
                </FormField>
              </div>
            )}
            <FormField
              id="trialPeriodText"
              label="試用期間"
              required
              hint="ない場合は「なし」。ある場合は期間と、その間の条件の違い。"
              error={errorOf("trialPeriodText")}
            >
              <Input
                {...text("trialPeriodText")}
                maxLength={200}
                placeholder="例：なし／3か月（条件の変更なし）"
              />
            </FormField>
            <FormField
              id="workHoursText"
              label="働く時間（始業・終業）"
              required
              hint="シフト制の場合は、その説明も。"
              error={errorOf("workHoursText")}
            >
              <Textarea
                {...text("workHoursText")}
                maxLength={500}
                rows={2}
                placeholder="例：9:00〜18:00／8:00〜20:00 のうち4時間〜（シフト制）"
              />
            </FormField>
            <FormField
              id="overtime"
              label="残業（時間外労働）"
              required
              error={errorOf("overtime")}
            >
              <Select {...text("overtime")}>
                <option value="">選んでください</option>
                <option value="NONE">なし</option>
                <option value="EXISTS">あり</option>
              </Select>
            </FormField>
            {d.overtime === "EXISTS" && (
              <FormField
                id="overtimeText"
                label="残業の目安"
                required
                error={errorOf("overtimeText")}
              >
                <Input {...text("overtimeText")} maxLength={300} placeholder="例：月10時間程度" />
              </FormField>
            )}
            <FormField id="breakText" label="休憩" required error={errorOf("breakText")}>
              <Input {...text("breakText")} maxLength={300} placeholder="例：60分" />
            </FormField>
            <FormField id="holidaysText" label="休日" required error={errorOf("holidaysText")}>
              <Textarea
                {...text("holidaysText")}
                maxLength={500}
                rows={2}
                placeholder="例：土日祝、年末年始／シフト制（週2日〜）"
              />
            </FormField>
          </>
        )}

        {step === 3 && (
          <>
            <div className="grid gap-5 sm:grid-cols-3">
              <FormField id="salaryType" label="給与の種類" required error={errorOf("salaryType")}>
                <Select {...text("salaryType")}>
                  <option value="">選んでください</option>
                  {Object.entries(SALARY_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField id="salaryMin" label="下限（円）" required error={errorOf("salaryMin")}>
                <Input {...num("salaryMin")} placeholder="例：1300" />
              </FormField>
              <FormField id="salaryMax" label="上限（円）" hint="任意" error={errorOf("salaryMax")}>
                <Input {...num("salaryMax")} placeholder="例：1500" />
              </FormField>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="fixedOvertimePay"
                checked={d.fixedOvertimePay}
                onCheckedChange={(v) => set("fixedOvertimePay", v === true)}
              />
              <Label htmlFor="fixedOvertimePay" className="font-normal">
                固定残業代（みなし残業代）がある
              </Label>
            </div>
            <FormField
              id="salaryNote"
              label="給与の補足"
              required={d.fixedOvertimePay}
              hint={
                d.fixedOvertimePay
                  ? "固定残業代の時間数と金額、それを超えた分は追加で支払うことを書いてください（例：月20時間分 30,000円を含む。超えた分は別途支給）"
                  : "任意。交通費・手当・昇給など。"
              }
              error={errorOf("salaryNote")}
            >
              <Textarea {...text("salaryNote")} maxLength={1000} rows={3} />
            </FormField>
            <fieldset className="space-y-2">
              <legend className="font-bold">加入する保険</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.entries(INSURANCES).map(([k, v]) => {
                  const checked = d.insurance.includes(k as never);
                  return (
                    <label
                      key={k}
                      className="flex items-center gap-2 rounded-xl border-2 border-ink bg-card px-3 py-2"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(on) =>
                          set(
                            "insurance",
                            (on
                              ? [...d.insurance, k]
                              : d.insurance.filter((x) => x !== k)) as JobDraft["insurance"],
                          )
                        }
                      />
                      {v}
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                条件を満たす場合は加入が義務の保険もあります。わからない場合は社会保険労務士などにご確認ください。
              </p>
            </fieldset>
            <FormField
              id="smokingMeasure"
              label="受動喫煙を防ぐための措置"
              required
              hint="法律で明示が必要です。"
              error={errorOf("smokingMeasure")}
            >
              <Select {...text("smokingMeasure")}>
                <option value="">選んでください</option>
                {Object.entries(SMOKING_MEASURES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </FormField>
            {d.smokingMeasure === "OTHER" && (
              <FormField id="smokingText" label="受動喫煙の措置の内容">
                <Input {...text("smokingText")} maxLength={300} />
              </FormField>
            )}

            <details
              open={showAge}
              onToggle={(e) => setShowAge((e.target as HTMLDetailsElement).open)}
              className="rounded-xl border-2 border-dashed border-ink p-4"
            >
              <summary className="cursor-pointer font-bold">
                年齢の条件（ふつうは入れません）
              </summary>
              <div className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  法律で、募集に年齢の制限を設けることは原則として禁止されています。下の例外にあたる場合だけ入れてください。
                </p>
                <FormField
                  id="ageExceptionReason"
                  label="例外の理由"
                  required
                  error={errorOf("ageExceptionReason")}
                >
                  <Select {...text("ageExceptionReason")}>
                    <option value="">選んでください</option>
                    {Object.entries(AGE_EXCEPTION_REASONS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField id="ageMin" label="下限（歳）">
                    <Input {...num("ageMin")} />
                  </FormField>
                  <FormField id="ageMax" label="上限（歳）" error={errorOf("ageMax")}>
                    <Input {...num("ageMax")} />
                  </FormField>
                </div>
              </div>
            </details>
          </>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold">プレビュー</h2>
              <div className="mt-2 rounded-xl border-2 border-ink bg-paper p-4">
                <p className="text-lg font-bold">{d.title || "（タイトル未入力）"}</p>
                <p className="mt-1 text-xl font-bold">
                  {formatSalary(d.salaryType, d.salaryMin, d.salaryMax)}
                </p>
                <p className="text-sm">
                  {d.prefecture}
                  {d.city}・{d.employmentType ? EMPLOYMENT_TYPES[d.employmentType] : ""}
                </p>
              </div>
            </div>

            {issues.length > 0 ? (
              <div className="rounded-xl border-2 border-ink bg-sun-soft p-4">
                <p className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="size-5" aria-hidden /> 公開する前に、あと{" "}
                  {issues.length} か所あります
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {issues.map((i) => (
                    <li key={`${i.field}-${i.message}`}>
                      <button
                        type="button"
                        className="text-left text-link underline"
                        onClick={() => setStep(FIELD_STEP[i.field] ?? 0)}
                      >
                        {i.message}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="flex items-center gap-2 rounded-xl border-2 border-ink bg-mint p-4 font-bold text-[#1e1b2e]">
                <Check className="size-5" aria-hidden /> 必要な項目はすべて入っています
              </p>
            )}

            {warnings.length > 0 && (
              <div className="rounded-xl border-2 border-dashed border-ink p-4 text-sm">
                <p className="flex items-center gap-2 font-bold">
                  <Lightbulb className="size-5" aria-hidden /> 言い換えのおすすめ
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {warnings.map((w) => (
                    <li key={w.term}>
                      「{w.term}」は性別を連想させる言葉です。「{w.suggestion}
                      」などの言い方がおすすめです。
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!isPublished && (
              <fieldset className="space-y-3">
                <legend className="font-bold">掲載前の確認</legend>
                {(
                  [
                    ["truthful", "求人の内容は事実です"],
                    ["lawful", "法律に違反する内容は含まれていません"],
                    [
                      "noLaborDispute",
                      "ストライキや作業所閉鎖が行われている事業所の求人ではありません",
                    ],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-start gap-2">
                    <Checkbox
                      checked={confirm[key]}
                      onCheckedChange={(v) => setConfirm((p) => ({ ...p, [key]: v === true }))}
                    />
                    <span className="leading-6">{label}</span>
                  </label>
                ))}
              </fieldset>
            )}
            {serverIssues.some((i) => i.field === "confirmations") && (
              <p className="text-sm font-bold text-destructive">{errorOf("confirmations")}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" disabled={step === 0 || pending} onClick={() => setStep(step - 1)}>
          <ChevronLeft /> もどる
        </Button>
        {step < 4 ? (
          <Button disabled={pending} onClick={() => go(step + 1)}>
            {pending ? "保存しています…" : isPublished ? "次へ" : "保存して次へ"} <ChevronRight />
          </Button>
        ) : (
          <Button
            size="lg"
            disabled={
              pending ||
              issues.length > 0 ||
              (!isPublished && !(confirm.truthful && confirm.lawful && confirm.noLaborDispute))
            }
            onClick={publish}
          >
            {pending ? "処理しています…" : isPublished ? "変更を保存する" : "この内容で公開する"}
          </Button>
        )}
      </div>
      {status === "HIDDEN" && (
        <p className="pop-card bg-sun-soft p-4 text-sm">
          この求人は運営が掲載を止めています。内容を直して保存したら、お問い合わせ窓口から連絡してください。
        </p>
      )}
    </div>
  );
}
