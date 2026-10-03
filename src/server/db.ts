import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

// 開発時のホットリロードで接続が増えないよう、1つのクライアントを使い回す（T014）
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: env().DATABASE_URL }),
  });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export type Db = typeof db;
/** トランザクション内で使えるクライアント */
export type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];
