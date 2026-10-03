import { loadEnvConfig } from "@next/env";

// Next.js と同じ規則で .env / .env.local / .env.test を読み込む
loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });

// テストは開発用 DB ではなくテスト用 DB に接続する
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
