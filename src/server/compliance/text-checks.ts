/**
 * 文章の確認（T019 / contracts/compliance-rules.md §2〜§4）。
 * 語句の一覧は公開前に専門家（弁護士・社会保険労務士）の確認を受ける。
 * 語句による検出は完全ではないため、通報と運営の見回りで補う。
 */

/** 全角英数を半角に、カタカナの長音などをそろえて比べやすくする */
function normalize(text: string) {
  return text.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
}

export type TermHit = { term: string; suggestion?: string };

/** §2 公開を止める：性別を限定する表現（男女雇用機会均等法） */
const GENDER_BLOCK = [
  "男性のみ",
  "女性のみ",
  "男性限定",
  "女性限定",
  "男性歓迎",
  "女性歓迎",
  "男性募集",
  "女性募集",
  "男子のみ",
  "女子のみ",
  "男性専用",
  "女性専用",
  "男性求む",
  "女性求む",
];

/** §2 注意を出す：性別を連想させる職種名（言い換えを提案。公開は止めない） */
const GENDER_WARN: TermHit[] = [
  { term: "営業マン", suggestion: "営業職" },
  { term: "ウェイトレス", suggestion: "ホールスタッフ" },
  { term: "ウェイター", suggestion: "ホールスタッフ" },
  { term: "看護婦", suggestion: "看護師" },
  { term: "保母", suggestion: "保育士" },
  { term: "主婦歓迎", suggestion: "主婦・主夫歓迎" },
  { term: "主婦向け", suggestion: "家事と両立したい方向け" },
  { term: "ol", suggestion: "事務職" },
  { term: "カメラマン", suggestion: "フォトグラファー" },
];

export function checkGender(text: string): { blocking: TermHit[]; warnings: TermHit[] } {
  const n = normalize(text);
  const blocking = GENDER_BLOCK.filter((t) => n.includes(normalize(t))).map((term) => ({
    term,
    suggestion: "どなたでも歓迎",
  }));
  const warnings = GENDER_WARN.filter(({ term }) =>
    term === "ol"
      ? /(^|[^a-z])ol([^a-z]|$)/i.test(text.normalize("NFKC"))
      : n.includes(normalize(term)),
  );
  return { blocking, warnings };
}

/** §3 年齢を限定する表現（例外理由がなければ公開を止める） */
const AGE_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\d{2}\s*(歳|才)\s*(まで|以下|未満|以上|くらい|位|前後)/, label: "〇歳まで／以下／以上" },
  { re: /\d{2}\s*[〜～~\-ー]\s*\d{2}\s*(歳|才)/, label: "〇〜〇歳" },
  { re: /\d{2}\s*代(の方|まで|活躍|中心|歓迎)/, label: "〇代の方" },
  { re: /(若い方|若手のみ|若者限定|若年層限定|年齢不問ではありません)/, label: "若い方など" },
];

export function checkAgeWording(text: string): string[] {
  const n = text.normalize("NFKC");
  return AGE_PATTERNS.filter(({ re }) => re.test(n)).map(({ label }) => label);
}

/** §4 求職の投稿の連絡先らしき文字列 */
export function checkContactInfo(text: string): ("EMAIL" | "PHONE" | "EXTERNAL")[] {
  const n = text.normalize("NFKC");
  const found: ("EMAIL" | "PHONE" | "EXTERNAL")[] = [];
  if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(n)) found.push("EMAIL");
  // 数字のあいだの区切り（ハイフン・長音・マイナス・空白・かっこ）を取り除いてから、0 で始まる10〜11桁を探す
  const digits = n.replace(/(?<=\d)[\s\-‐‑–—−ー－()（）.]+(?=\d)/g, "");
  if (/(?<!\d)0\d{9,10}(?!\d)/.test(digits)) found.push("PHONE");
  if (
    /(line|ライン)\s*(id|ＩＤ|ｉｄ)?|インスタ|instagram|twitter|ツイッター|discord|ディスコード|カカオ|kakao/i.test(
      n,
    )
  ) {
    found.push("EXTERNAL");
  }
  return found;
}

export const CONTACT_INFO_LABEL = {
  EMAIL: "メールアドレス",
  PHONE: "電話番号",
  EXTERNAL: "SNS・外部の連絡手段",
} as const;
