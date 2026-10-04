import {
  EMPLOYMENT_TYPES,
  JOB_CATEGORIES,
  type JobCategory,
  SALARY_TYPES,
  type SalaryType,
} from "./master-data";

const yen = (n: number) => n.toLocaleString("ja-JP");

/** 給与の表示（例：時給 1,300〜1,500円、年俸 480万〜720万円） */
export function formatSalary(
  type: SalaryType | null | undefined,
  min: number | null | undefined,
  max?: number | null,
) {
  if (!type || !min) return "応相談";
  const label = SALARY_TYPES[type];
  if (type === "ANNUAL") {
    const man = (n: number) => `${Math.round(n / 10000).toLocaleString("ja-JP")}万`;
    return max && max !== min ? `${label} ${man(min)}〜${man(max)}円` : `${label} ${man(min)}円〜`;
  }
  return max && max !== min ? `${label} ${yen(min)}〜${yen(max)}円` : `${label} ${yen(min)}円〜`;
}

export function categoryLabel(category: string | null | undefined) {
  return category && category in JOB_CATEGORIES
    ? JOB_CATEGORIES[category as JobCategory].label
    : "その他";
}

export function employmentLabel(type: string | null | undefined) {
  return type && type in EMPLOYMENT_TYPES
    ? EMPLOYMENT_TYPES[type as keyof typeof EMPLOYMENT_TYPES]
    : "";
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** 「3日前」「たった今」など */
export function relativeTime(d: Date | string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "たった今";
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}日前`;
  return formatDate(d);
}
