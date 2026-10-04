/**
 * 掲示板のマスターデータ（T006）。画面・検証・テストで共通に使う。
 * 年齢の例外理由の文言は contracts/compliance-rules.md §3 と同じ（公開前に専門家の確認を受ける）。
 */

export const PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
] as const;
export type Prefecture = (typeof PREFECTURES)[number];

/** 職種。icon は lucide-react のアイコン名、tone はデザイントークンの色 */
export const JOB_CATEGORIES = {
  OFFICE: { label: "事務・オフィス", icon: "Briefcase", tone: "sky" },
  SALES: { label: "営業", icon: "Handshake", tone: "sun" },
  RETAIL: { label: "販売・接客", icon: "ShoppingBag", tone: "coral" },
  FOOD: { label: "飲食・フード", icon: "UtensilsCrossed", tone: "coral" },
  IT: { label: "IT・エンジニア", icon: "Laptop", tone: "sky" },
  CREATIVE: { label: "クリエイティブ", icon: "Palette", tone: "lilac" },
  MANUFACTURING: { label: "製造・工場", icon: "Factory", tone: "sun" },
  LOGISTICS: { label: "物流・ドライバー", icon: "Truck", tone: "sun" },
  CONSTRUCTION: { label: "建設・土木", icon: "HardHat", tone: "sun" },
  CARE: { label: "医療・介護・福祉", icon: "HeartPulse", tone: "mint" },
  EDUCATION: { label: "教育・保育", icon: "GraduationCap", tone: "mint" },
  BEAUTY: { label: "美容・理容", icon: "Scissors", tone: "lilac" },
  LIGHT_WORK: { label: "軽作業・清掃", icon: "Package", tone: "mint" },
  OTHER: { label: "その他", icon: "Sparkles", tone: "lilac" },
} as const;
export type JobCategory = keyof typeof JOB_CATEGORIES;
export const JOB_CATEGORY_KEYS = Object.keys(JOB_CATEGORIES) as JobCategory[];

/** 雇用形態（FR-010）。業務委託など雇用でない募集は載せない */
export const EMPLOYMENT_TYPES = {
  FULL_TIME: "正社員",
  CONTRACT: "契約社員",
  PART_TIME: "パート・アルバイト",
  DISPATCH: "派遣",
} as const;
export type EmploymentType = keyof typeof EMPLOYMENT_TYPES;
export const EMPLOYMENT_TYPE_KEYS = Object.keys(EMPLOYMENT_TYPES) as EmploymentType[];

export const SALARY_TYPES = {
  HOURLY: "時給",
  DAILY: "日給",
  MONTHLY: "月給",
  ANNUAL: "年俸",
} as const;
export type SalaryType = keyof typeof SALARY_TYPES;

export const CONTRACT_TYPES = {
  INDEFINITE: "期間の定めなし",
  FIXED_TERM: "期間の定めあり（有期）",
} as const;
export const RENEWAL_POLICIES = {
  RENEWABLE: "更新あり",
  CONDITIONAL: "条件により更新あり",
  NOT_RENEWABLE: "更新なし",
} as const;
export const REMOTE_WORK = { NONE: "出社", PARTIAL: "一部リモート", FULL: "フルリモート" } as const;
export const OVERTIME = { NONE: "なし", EXISTS: "あり" } as const;

export const INSURANCES = {
  EMPLOYMENT: "雇用保険",
  WORKERS_COMP: "労災保険",
  HEALTH: "健康保険",
  PENSION: "厚生年金",
} as const;
export type Insurance = keyof typeof INSURANCES;

export const SMOKING_MEASURES = {
  NO_SMOKING_INDOOR: "屋内禁煙",
  SMOKING_ROOM: "喫煙室あり（それ以外は禁煙）",
  NO_MEASURE: "対策なし",
  OTHER: "その他",
} as const;
export type SmokingMeasure = keyof typeof SMOKING_MEASURES;

/** 年齢の条件の例外理由（FR-012、労働施策総合推進法施行規則第1条の3） */
export const AGE_EXCEPTION_REASONS = {
  RETIREMENT_AGE:
    "定年年齢を上限として、その年齢未満の方を期間の定めのない雇用で募集するため（1号）",
  LEGAL_RESTRICTION: "法令で年齢の制限が定められている業務のため（2号）",
  YOUTH_CAREER: "長期のキャリア形成のため、若年者などを期間の定めのない雇用で募集するため（3号イ）",
  SKILL_SUCCESSION:
    "技能・ノウハウを継承するため、労働者が少ない特定の年齢層を期間の定めのない雇用で募集するため（3号ロ）",
  ARTS: "芸術・芸能の分野で、表現の真実性などが求められるため（3号ハ）",
  SENIOR_PROMOTION:
    "60歳以上の方、または国の雇用促進施策の対象となる年齢層に限って募集するため（3号ニ）",
} as const;
export type AgeExceptionReason = keyof typeof AGE_EXCEPTION_REASONS;

export const REPORT_REASONS = {
  ILLEGAL: "法律に違反している",
  FALSE_INFO: "内容が事実と違う",
  DISCRIMINATION: "差別的な内容がある",
  HARASSMENT: "いやがらせ・不快な内容",
  SPAM: "迷惑な宣伝・スパム",
  SCAM: "詐欺・お金の要求",
  OTHER: "その他",
} as const;
export type ReportReason = keyof typeof REPORT_REASONS;

/** 応募のときに企業へ共有できるプロフィールの項目（FR-022） */
export const SHAREABLE_PROFILE_FIELDS = {
  desiredCategories: "希望する職種",
  desiredPrefectures: "希望する勤務地",
  experience: "これまでの経験",
  qualifications: "資格・スキル",
  selfIntroduction: "自己紹介",
} as const;
export type ShareableProfileField = keyof typeof SHAREABLE_PROFILE_FIELDS;

/** 求人の掲載期間の上限（FR-014） */
export const JOB_LISTING_DAYS = 60;
