import type { AxisTurn, ReflectionDraft } from "./schemas";
import { ASPECTS, type Aspect } from "./schemas";
import type { AxisAi, TranscriptMessage } from "./types";

/**
 * API キーなしで画面・E2E を動かすためのモック（T029）。
 * 観点を順番に問い、本人が4回答えたら readyToSummarize になる。
 * 整理結果は、本人の発言をそのまま観点ごとに割り当てる。
 */
const QUESTIONS: Record<Aspect, string> = {
  FEELINGS: "いまの仕事や状況について、気になっていることや違和感はありますか？",
  MOTIVATION: "もし環境を変えるとしたら、本当に実現したい状態はどんなものですか？",
  CRITERIA: "仕事を選ぶとき、譲れないことと、譲ってもよいことは何ですか？",
  OPEN_QUESTIONS: "まだ分かっていないことや、CA と一緒に考えたいことはありますか？",
};

const SAFETY_KEYWORDS = ["死にたい", "消えたい", "自殺"];

function personAnswers(transcript: TranscriptMessage[]) {
  return transcript.filter((m) => m.role === "PERSON").map((m) => m.content);
}

export const mockAi: AxisAi = {
  async nextTurn({ transcript }) {
    const answered = Math.min(personAnswers(transcript).length, ASPECTS.length);
    const coverage = Object.fromEntries(
      ASPECTS.map((a, i) => [a, i < answered ? 1 : 0]),
    ) as AxisTurn["coverage"];

    if (answered >= ASPECTS.length) {
      return {
        kind: "MATERIAL",
        text: "ここまでのお話で、4つの観点がひととおり出そろいました。整理結果を作って、一緒に見返してみましょう。",
        coverage,
        readyToSummarize: true,
      };
    }
    const aspect = ASPECTS[answered];
    return { kind: "QUESTION", text: QUESTIONS[aspect], aspect, coverage, readyToSummarize: false };
  },

  async draftReflection(transcript): Promise<ReflectionDraft> {
    const answers = personAnswers(transcript);
    return {
      sections: ASPECTS.map((aspect, i) => ({
        aspect,
        content: (answers[i] ?? "").slice(0, 2000),
        sensitiveHint: false,
      })),
      recordEntries: [
        { type: "CONCERNS", content: (answers[0] ?? "").slice(0, 1000) },
        { type: "VALUES", content: (answers[1] ?? "").slice(0, 1000) },
        { type: "CRITERIA_VISION", content: (answers[2] ?? "").slice(0, 1000) },
      ].filter((e) => e.content.length > 0) as ReflectionDraft["recordEntries"],
    };
  },

  async assessSafety(personMessage) {
    return { concerning: SAFETY_KEYWORDS.some((k) => personMessage.includes(k)) };
  },
};
