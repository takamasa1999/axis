import { execSync } from "node:child_process";
import { loadEnvConfig } from "@next/env";

// テスト用 DB にマイグレーションを適用してからテストを始める
export default function setup() {
  loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL が未設定です（.env.example を参照）");
  }
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
