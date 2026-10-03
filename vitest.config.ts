import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// unit: DB なし / integration・contract: テスト用 DB（axis_test）を使い、ファイルを順番に実行する
// ai-eval: 実際のモデルを呼ぶ評価テスト（AI_PROVIDER=mock のときはスキップ）
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    // "server-only" は React Server Components 以外で読むとエラーになるため、テストでは空のモジュールにする
    alias: { "server-only": new URL("./tests/helpers/empty.ts", import.meta.url).pathname },
  },
  test: {
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.{ts,tsx}"],
          environment: "node",
          setupFiles: ["tests/helpers/load-env.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          setupFiles: ["tests/helpers/load-env.ts"],
          globalSetup: ["tests/helpers/global-setup-db.ts"],
          fileParallelism: false,
        },
      },
      {
        extends: true,
        test: {
          name: "contract",
          include: ["tests/contract/**/*.test.ts"],
          environment: "node",
          setupFiles: ["tests/helpers/load-env.ts"],
          globalSetup: ["tests/helpers/global-setup-db.ts"],
          fileParallelism: false,
        },
      },
      {
        extends: true,
        test: {
          name: "ai-eval",
          include: ["tests/ai-eval/**/*.test.ts"],
          environment: "node",
          setupFiles: ["tests/helpers/load-env.ts"],
          testTimeout: 120_000,
        },
      },
    ],
  },
});
