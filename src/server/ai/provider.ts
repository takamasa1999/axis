import "server-only";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createAnthropic } from "@ai-sdk/anthropic";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import { env } from "@/lib/env";
import { createLiveAi } from "./live";
import { mockAi } from "./mock";
import type { AxisAi } from "./types";

/**
 * AI プロバイダーの切り替え（T027 / research R5）
 * - openrouter: ローカル開発で実際のモデルを使うとき
 * - bedrock: 本番。ECS のタスクロールなど、AWS の標準の認証情報を使う
 * - anthropic: Anthropic API を直接使うとき
 * - mock: API キーなしで動かすとき（テスト・E2E）
 */
export function languageModel(): LanguageModel {
  const e = env();
  if (!e.AI_MODEL_ID) {
    throw new Error("AI_MODEL_ID が未設定です");
  }
  switch (e.AI_PROVIDER) {
    case "openrouter":
      return createOpenRouter({ apiKey: e.OPENROUTER_API_KEY, appName: "Axis" })(e.AI_MODEL_ID);
    case "bedrock":
      return createAmazonBedrock({
        region: e.AWS_REGION,
        credentialProvider: fromNodeProviderChain(),
      })(e.AI_MODEL_ID);
    case "anthropic":
      return createAnthropic({ apiKey: e.ANTHROPIC_API_KEY })(e.AI_MODEL_ID);
    case "mock":
      throw new Error("AI_PROVIDER=mock のときは axisAi() のモックを使ってください");
  }
}

let live: AxisAi | undefined;

/** Axis の AI 処理を取得する。画面やほかの処理は LLM を直接呼ばず、これを通す */
export function axisAi(): AxisAi {
  if (env().AI_PROVIDER === "mock") return mockAi;
  live ??= createLiveAi(languageModel());
  return live;
}
