import "server-only";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createAnthropic } from "@ai-sdk/anthropic";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import type { LanguageModel } from "ai";
import { env } from "@/lib/env";
import { mockAi } from "./mock";
import type { AxisAi } from "./types";

/**
 * AI プロバイダーの切り替え（T027 / research R5）
 * - bedrock: 本番。ECS のタスクロールなど、AWS の標準の認証情報を使う
 * - anthropic: ローカルで実際のモデルを試すとき
 * - mock: API キーなしで動かすとき（既定）
 */
export function languageModel(): LanguageModel {
  const e = env();
  if (!e.AI_MODEL_ID) {
    throw new Error("AI_MODEL_ID が未設定です");
  }
  switch (e.AI_PROVIDER) {
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

/**
 * Axis の AI 処理を取得する。
 * 実際のモデルを使う実装（live.ts）は US1（T037）で作る。それまでは mock のみ使える。
 */
export function axisAi(): AxisAi {
  if (env().AI_PROVIDER === "mock") return mockAi;
  throw new Error(
    "実際のモデルを使う AI 処理は US1（T037）で実装します。AI_PROVIDER=mock を使ってください",
  );
}
