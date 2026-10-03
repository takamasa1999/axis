/**
 * ローカル開発用のシード（T015）。本番では実行しない。
 *
 * 作るもの：
 *   - 検証用の紹介会社 1社（PILOT）
 *   - 管理者 1名（ADMIN） / CA 2名 / 運営 1名
 * パスワードはすべて SEED_STAFF_PASSWORD（.env.example を参照）
 *
 * 何度実行しても同じ状態になる（メールアドレスで既存の行を探して更新する）。
 */
import { loadEnvConfig } from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import type { AgencyRole } from "../src/generated/prisma/enums";

loadEnvConfig(process.cwd());

if (process.env.NODE_ENV === "production") {
  throw new Error("シードは本番環境では実行できません");
}

const password = process.env.SEED_STAFF_PASSWORD;
if (!password || password.length < 12) {
  throw new Error("SEED_STAFF_PASSWORD（12文字以上）を .env.local に設定してください");
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const AGENCY_NAME = "検証用キャリア紹介株式会社";

type StaffSeed = { email: string; name: string; role?: AgencyRole; isOperator?: boolean };

const STAFF: StaffSeed[] = [
  { email: "admin@agency.example", name: "管理者 太郎", role: "ADMIN" },
  { email: "ca1@agency.example", name: "CA 花子", role: "CA" },
  { email: "ca2@agency.example", name: "CA 次郎", role: "CA" },
  { email: "ops@axis.example", name: "運営 さくら", isOperator: true },
];

async function upsertStaff(seed: StaffSeed, passwordHash: string) {
  const user = await db.user.upsert({
    where: { email: seed.email },
    update: { name: seed.name, kind: "STAFF", isOperator: seed.isOperator ?? false },
    create: {
      email: seed.email,
      name: seed.name,
      emailVerified: true,
      kind: "STAFF",
      isOperator: seed.isOperator ?? false,
    },
  });

  // Better Auth のメール＋パスワード認証は providerId = "credential" の Account を使う
  const account = await db.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });
  if (account) {
    await db.account.update({ where: { id: account.id }, data: { password: passwordHash } });
  } else {
    await db.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: passwordHash,
      },
    });
  }
  return user;
}

async function main() {
  const passwordHash = await hashPassword(password as string);

  const agency =
    (await db.agency.findFirst({ where: { name: AGENCY_NAME } })) ??
    (await db.agency.create({ data: { name: AGENCY_NAME, status: "PILOT" } }));

  for (const seed of STAFF) {
    const user = await upsertStaff(seed, passwordHash);
    if (seed.role) {
      await db.agencyMember.upsert({
        where: { agencyId_userId: { agencyId: agency.id, userId: user.id } },
        update: { role: seed.role, active: true },
        create: { agencyId: agency.id, userId: user.id, role: seed.role },
      });
    }
  }

  console.log(`シード完了: ${AGENCY_NAME} / ${STAFF.map((s) => s.email).join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
