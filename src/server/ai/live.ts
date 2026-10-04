import "server-only";
import { generateText, type LanguageModel, Output, streamText } from "ai";
import { logger } from "@/server/logger";
import { dialogueSystemPrompt } from "./prompts/dialogue";
import { REFLECTION_SYSTEM_PROMPT } from "./prompts/reflection";
import { hasSafetyKeyword, SAFETY_CLASSIFIER_PROMPT } from "./safety";
import { AxisTurn, ReflectionDraft, SafetyAssessment } from "./schemas";
import type { AxisAi, TranscriptMessage, TurnContext } from "./types";

/** AI に渡す会話の形に変換する（本人 = user、Axis = assistant） */
function toMessages(transcript: TranscriptMessage[]) {
  return transcript.map((m) => ({
    role: m.role === "PERSON" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));
}

function transcriptText(transcript: TranscriptMessage[]) {
  return transcript.map((m) => `${m.role === "PERSON" ? "本人" : "Axis"}: ${m.content}`).join("\n");
}

/**
 * 実際のモデルを使う AI 処理（T037）。
 * 応答は構造化出力で受け取り、Zod で検証する。検証に失敗したら1回だけ作り直す。
 */
export function createLiveAi(model: LanguageModel): AxisAi {
  async function streamOnce(ctx: TurnContext, onTextDelta?: (delta: string) => void) {
    const result = streamText({
      model,
      system: dialogueSystemPrompt(ctx.pastRecords),
      messages: toMessages(ctx.transcript),
      output: Output.object({ schema: AxisTurn }),
      maxOutputTokens: 1500,
    });

    let sent = "";
    for await (const partial of result.partialOutputStream) {
      const text = typeof partial?.text === "string" ? partial.text : "";
      if (text.length > sent.length && text.startsWith(sent)) {
        onTextDelta?.(text.slice(sent.length));
        sent = text;
      }
    }
    const output = AxisTurn.parse(await result.output);
    if (output.kind === "SAFETY") {
      // SAFETY はアプリ側の判定でだけ使う。AI が返した場合は問いとして扱う
      return { ...output, kind: "QUESTION" as const };
    }
    return output;
  }

  return {
    async nextTurn(ctx, onTextDelta) {
      try {
        return await streamOnce(ctx, onTextDelta);
      } catch (error) {
        logger.warn("dialogue turn invalid, retrying once", { error });
        // 1回目で途中まで表示された文は、画面側で置き換える
        return await streamOnce(ctx, undefined);
      }
    },

    async draftReflection(transcript) {
      const run = () =>
        generateText({
          model,
          system: REFLECTION_SYSTEM_PROMPT,
          prompt: `次の対話の記録から、整理結果を作ってください。\n\n${transcriptText(transcript)}`,
          output: Output.object({ schema: ReflectionDraft }),
          maxOutputTokens: 4000,
        });
      try {
        return ReflectionDraft.parse((await run()).output);
      } catch (error) {
        logger.warn("reflection draft invalid, retrying once", { error });
        return ReflectionDraft.parse((await run()).output);
      }
    },

    async assessSafety(personMessage) {
      if (hasSafetyKeyword(personMessage)) return { concerning: true };
      try {
        const { output } = await generateText({
          model,
          system: SAFETY_CLASSIFIER_PROMPT,
          prompt: personMessage,
          output: Output.object({ schema: SafetyAssessment }),
          maxOutputTokens: 100,
        });
        return SafetyAssessment.parse(output);
      } catch (error) {
        // 判定に失敗しても対話は続ける（キーワード判定は済んでいる）
        logger.warn("safety assessment failed", { error });
        return { concerning: false };
      }
    },
  };
}
