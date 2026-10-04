import { hasSafetyKeyword } from "./safety";
import { ASPECTS, type Aspect, type AxisTurn, type ReflectionDraft } from "./schemas";
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

function personAnswers(transcript: TranscriptMessage[]) {
  return transcript.filter((m) => m.role === "PERSON").map((m) => m.content);
}

function mockTurn(transcript: TranscriptMessage[]): AxisTurn {
  // 最初の問い（FEELINGS）は画面側の固定文で出しているため、1回目の回答の次は MOTIVATION から問う
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
}

function mockReflection(transcript: TranscriptMessage[]): ReflectionDraft {
  const answers = personAnswers(transcript);
  const entries: ReflectionDraft["recordEntries"] = [
    { type: "CONCERNS", content: answers[0] ?? "" },
    { type: "VALUES", content: answers[1] ?? "" },
    { type: "CRITERIA_VISION", content: answers[2] ?? "" },
  ];
  return {
    sections: ASPECTS.map((aspect, i) => ({
      aspect,
      content: (answers[i] ?? "まだ話していません").slice(0, 2000),
      sensitiveHint: false,
    })),
    recordEntries: entries
      .filter((e) => e.content.length > 0)
      .map((e) => ({ ...e, content: e.content.slice(0, 1000) })),
  };
}

export const mockAi: AxisAi = {
  async nextTurn({ transcript }, onTextDelta) {
    const turn = mockTurn(transcript);
    onTextDelta?.(turn.text);
    return turn;
  },
  async draftReflection(transcript) {
    return mockReflection(transcript);
  },
  async assessSafety(personMessage) {
    return { concerning: hasSafetyKeyword(personMessage) };
  },
};
