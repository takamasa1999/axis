import type {
  Decision,
  MilestoneKind,
  RecordEntryType,
  ReflectionAspect,
} from "@/generated/prisma/enums";

/** 画面に表示する日本語の名前 */
export const MILESTONE_KIND_LABEL: Record<MilestoneKind, string> = {
  JOB_SEARCH: "就職",
  CAREER_CHANGE: "転職",
  PROMOTION_TRANSFER: "昇進・異動",
  RESKILLING: "学び直し",
  LIFE_EVENT: "人生の変化",
};

export const ASPECT_LABEL: Record<ReflectionAspect, string> = {
  FEELINGS: "いまの気持ち・違和感",
  MOTIVATION: "変えたい理由・実現したい状態",
  CRITERIA: "大切にしたい判断軸",
  OPEN_QUESTIONS: "まだ分からないこと・CAと考えたいこと",
};

export const RECORD_ENTRY_LABEL: Record<RecordEntryType, string> = {
  VALUES: "その時点の価値観",
  CONCERNS: "悩み・違和感",
  CRITERIA_VISION: "判断軸・将来像",
  OPTIONS_COMPARED: "比較した選択肢",
  REASON: "なぜ選んだか",
};

export const DECISION_LABEL: Record<Decision, string> = {
  APPLY: "応募する",
  DECLINE: "辞退する",
  ACCEPT_OFFER: "内定を受ける",
  STAY: "今は転職しない",
  OTHER: "その他",
};

export const ASPECT_ORDER: ReflectionAspect[] = [
  "FEELINGS",
  "MOTIVATION",
  "CRITERIA",
  "OPEN_QUESTIONS",
];
