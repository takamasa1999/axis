import type { AxisTurn, ReflectionDraft, SafetyAssessment } from "./schemas";

export type TranscriptMessage = {
  role: "PERSON" | "AXIS";
  content: string;
};

/** 過去の節目の記録（本人自身のものだけ。FR-014） */
export type PastRecord = {
  type: "VALUES" | "CRITERIA_VISION" | "REASON";
  content: string;
  recordedAt: Date;
};

export type TurnContext = {
  transcript: TranscriptMessage[];
  pastRecords: PastRecord[];
};

/**
 * Axis が AI に頼む処理の一覧。画面やほかの処理は LLM を直接呼ばず、これを通す。
 * 実装は live.ts（実際のモデル）と mock.ts（固定の応答）の2つ。
 */
export interface AxisAi {
  /** 対話の次のターンを作る。onTextDelta には本人に表示する文の差分が届く */
  nextTurn(ctx: TurnContext, onTextDelta?: (delta: string) => void): Promise<AxisTurn>;
  /** 対話全体から整理結果の下書きを作る */
  draftReflection(transcript: TranscriptMessage[]): Promise<ReflectionDraft>;
  /** 本人の発言に危険な兆候があるかを判定する */
  assessSafety(personMessage: string): Promise<SafetyAssessment>;
}
