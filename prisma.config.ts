import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Next.js と同じ規則で .env.local などを読み込む
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
