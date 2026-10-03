import { z } from "zod";

/** contracts/ai-dialogue.md の構造（T028）。AI の出力はこの形でしか受け取らない */

export const ASPECTS = ["FEELINGS", "MOTIVATION", "CRITERIA", "OPEN_QUESTIONS"] as const;
export const AspectSchema = z.enum(ASPECTS);
export type Aspect = z.infer<typeof AspectSchema>;

const coverageLevel = z.number().int().min(0).max(2);

/** 対話の1ターン分の応答。AI の応答は問い・考える材料・安全対応のいずれかに限る（原則II） */
export const AxisTurn = z.object({
  kind: z.enum(["QUESTION", "MATERIAL", "SAFETY"]),
  text: z.string().min(1).max(1200),
  aspect: AspectSchema.optional(),
  coverage: z.object({
    FEELINGS: coverageLevel,
    MOTIVATION: coverageLevel,
    CRITERIA: coverageLevel,
    OPEN_QUESTIONS: coverageLevel,
  }),
  readyToSummarize: z.boolean(),
});
export type AxisTurn = z.infer<typeof AxisTurn>;

/** Phase1 の記録項目（FR-010） */
export const RecordEntryTypeSchema = z.enum([
  "VALUES",
  "CONCERNS",
  "CRITERIA_VISION",
  "OPTIONS_COMPARED",
  "REASON",
]);

/** 対話の完了時に作る整理結果の下書き */
export const ReflectionDraft = z.object({
  sections: z
    .array(
      z.object({
        aspect: AspectSchema,
        content: z.string().max(2000),
        sensitiveHint: z.boolean(),
      }),
    )
    .length(4)
    .refine((s) => new Set(s.map((x) => x.aspect)).size === 4, {
      message: "4観点をそれぞれ1つずつ含める必要があります",
    }),
  recordEntries: z.array(
    z.object({
      type: RecordEntryTypeSchema,
      content: z.string().max(1000),
    }),
  ),
});
export type ReflectionDraft = z.infer<typeof ReflectionDraft>;

/** 本人の発言（1件あたり最大 4,000 文字） */
export const PersonMessageSchema = z.string().trim().min(1).max(4000);

/** 危険な兆候の判定結果 */
export const SafetyAssessment = z.object({ concerning: z.boolean() });
export type SafetyAssessment = z.infer<typeof SafetyAssessment>;
