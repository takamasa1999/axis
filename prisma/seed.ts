/**
 * ローカル開発用のシード（002 / T010）。本番では実行しない。
 *
 * 作るもの（パスワードはすべて SEED_STAFF_PASSWORD。.env.example を参照）：
 *   - 運営：ops@axis.example
 *   - 企業：cafe@axis.example（ひだまりカフェ）、tech@axis.example（ミライテック株式会社）と、公開中の求人6件
 *   - 求職者：seeker@axis.example（プロフィールと求職の投稿1件）
 *   - ENABLE_AGENCY_PILOT=true のときだけ、001 の紹介会社（検証用キャリア紹介株式会社）と CA
 *
 * 何度実行しても同じ状態になる（メールアドレスで既存の行を探して更新する。求人はシードのものだけ作り直す）。
 */
import { loadEnvConfig } from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import type { AgencyRole, UserKind } from "../src/generated/prisma/enums";

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
const DAY = 24 * 60 * 60 * 1000;

async function upsertUser(
  email: string,
  kind: UserKind,
  passwordHash: string,
  extra: { name?: string; isOperator?: boolean } = {},
) {
  const now = new Date();
  const user = await db.user.upsert({
    where: { email },
    update: {
      kind,
      isOperator: extra.isOperator ?? false,
      emailVerified: true,
      deletedAt: null,
      suspendedAt: null,
      lockedUntil: null,
    },
    create: {
      email,
      kind,
      name: extra.name ?? "",
      emailVerified: true,
      isOperator: extra.isOperator ?? false,
      termsVersion: process.env.TERMS_VERSION ?? "2026-10-draft",
      termsAcceptedAt: now,
      ageConfirmedAt: kind === "PERSON" ? now : null,
    },
  });
  const account = await db.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });
  if (account)
    await db.account.update({ where: { id: account.id }, data: { password: passwordHash } });
  else
    await db.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: passwordHash,
      },
    });
  return user;
}

/** 必須の労働条件をすべて埋めた求人の共通部分 */
const baseJob = {
  jobChangeScope: "変更なし",
  contractType: "INDEFINITE" as const,
  trialPeriodText: "なし",
  locationChangeScope: "変更なし",
  overtime: "NONE" as const,
  breakText: "6時間を超える場合は45分、8時間を超える場合は60分",
  smokingMeasure: "NO_SMOKING_INDOOR" as const,
};

async function main() {
  const passwordHash = await hashPassword(password as string);

  // ---- 運営 ----
  await upsertUser("ops@axis.example", "STAFF", passwordHash, {
    name: "運営 さくら",
    isOperator: true,
  });

  // ---- 企業と求人 ----
  const cafe = await upsertUser("cafe@axis.example", "EMPLOYER", passwordHash);
  const tech = await upsertUser("tech@axis.example", "EMPLOYER", passwordHash);
  await db.employerProfile.upsert({
    where: { userId: cafe.id },
    update: {},
    create: {
      userId: cafe.id,
      companyName: "ひだまりカフェ",
      prefecture: "東京都",
      address: "渋谷区神南1-2-3",
      businessDescription:
        "自家焙煎のコーヒーと手づくりのお菓子のカフェです。のんびりした雰囲気のお店です。",
      contactName: "店長 たなか",
    },
  });
  await db.employerProfile.upsert({
    where: { userId: tech.id },
    update: {},
    create: {
      userId: tech.id,
      companyName: "ミライテック株式会社",
      prefecture: "大阪府",
      address: "大阪市北区梅田4-5-6",
      businessDescription:
        "中小企業向けの業務アプリをつくっている、社員30名のソフトウェア会社です。",
      websiteUrl: "https://example.com",
    },
  });

  await db.jobPost.deleteMany({ where: { employerId: { in: [cafe.id, tech.id] } } });
  const now = Date.now();
  const jobs = [
    {
      employerId: cafe.id,
      title: "カフェのホールスタッフ（未経験OK）",
      category: "FOOD",
      employmentType: "PART_TIME" as const,
      jobDescription:
        "ドリンクの提供、レジ、お店の清掃をお願いします。はじめは先輩と一緒に入るので安心です。",
      prefecture: "東京都",
      city: "渋谷区",
      workHoursText: "8:00〜20:00 のうち1日4時間から（シフト制）",
      holidaysText: "シフト制（週2日〜OK）",
      salaryType: "HOURLY" as const,
      salaryMin: 1300,
      salaryMax: 1500,
      salaryNote: "交通費は1日1,000円まで支給。まかないあり。",
      insurance: ["WORKERS_COMP"],
      daysAgo: 1,
    },
    {
      employerId: cafe.id,
      title: "焼き菓子づくりのキッチンスタッフ",
      category: "FOOD",
      employmentType: "PART_TIME" as const,
      jobDescription: "クッキーやマフィンの仕込みと焼成、袋づめをお願いします。",
      prefecture: "東京都",
      city: "渋谷区",
      workHoursText: "7:00〜15:00 のうち1日5時間から",
      holidaysText: "土日のどちらか＋平日（週3日〜）",
      salaryType: "HOURLY" as const,
      salaryMin: 1350,
      insurance: ["WORKERS_COMP", "EMPLOYMENT"],
      daysAgo: 3,
    },
    {
      employerId: cafe.id,
      title: "店長候補（正社員）",
      category: "FOOD",
      employmentType: "FULL_TIME" as const,
      jobDescription: "お店の運営全般（スタッフのシフト管理、仕入れ、売上の管理）をお任せします。",
      jobChangeScope: "会社の定める飲食関連の業務",
      prefecture: "東京都",
      city: "渋谷区",
      locationChangeScope: "東京都内の当社店舗",
      workHoursText: "9:00〜18:00（実働8時間）",
      overtime: "EXISTS" as const,
      overtimeText: "月10時間程度",
      holidaysText: "週休2日（シフト制）、夏季・年末年始休暇",
      salaryType: "MONTHLY" as const,
      salaryMin: 260000,
      salaryMax: 320000,
      trialPeriodText: "3か月（条件の変更なし）",
      insurance: ["EMPLOYMENT", "WORKERS_COMP", "HEALTH", "PENSION"],
      daysAgo: 5,
    },
    {
      employerId: tech.id,
      title: "Web アプリのエンジニア（TypeScript）",
      category: "IT",
      employmentType: "FULL_TIME" as const,
      jobDescription:
        "自社サービスの画面とサーバーの開発。仕様の相談からリリースまで、チームで進めます。",
      jobChangeScope: "会社の定める業務",
      prefecture: "大阪府",
      city: "大阪市北区",
      remoteWork: "PARTIAL" as const,
      locationChangeScope: "本社または自宅（リモート勤務）",
      workHoursText: "10:00〜19:00（フレックスタイム制、コアタイム 11:00〜15:00）",
      overtime: "EXISTS" as const,
      overtimeText: "月15時間程度",
      holidaysText: "完全週休2日（土日祝）、年末年始、夏季休暇",
      salaryType: "ANNUAL" as const,
      salaryMin: 4800000,
      salaryMax: 7200000,
      trialPeriodText: "3か月（条件の変更なし）",
      insurance: ["EMPLOYMENT", "WORKERS_COMP", "HEALTH", "PENSION"],
      daysAgo: 0,
    },
    {
      employerId: tech.id,
      title: "カスタマーサポート（契約社員）",
      category: "OFFICE",
      employmentType: "CONTRACT" as const,
      jobDescription: "お客さまからのメール・電話でのお問い合わせ対応と、よくある質問の更新。",
      contractType: "FIXED_TERM" as const,
      contractTermText: "6か月",
      renewalPolicy: "CONDITIONAL" as const,
      renewalCapText: "通算5年まで",
      prefecture: "大阪府",
      city: "大阪市北区",
      workHoursText: "9:30〜18:00",
      holidaysText: "土日祝",
      salaryType: "MONTHLY" as const,
      salaryMin: 230000,
      insurance: ["EMPLOYMENT", "WORKERS_COMP", "HEALTH", "PENSION"],
      daysAgo: 2,
    },
    {
      employerId: tech.id,
      title: "デザイナー（業務アプリの画面）",
      category: "CREATIVE",
      employmentType: "FULL_TIME" as const,
      jobDescription:
        "業務アプリの画面設計と、使いやすさの改善。利用者へのヒアリングにも参加します。",
      jobChangeScope: "会社の定める業務",
      prefecture: "大阪府",
      city: "大阪市北区",
      remoteWork: "FULL" as const,
      locationChangeScope: "自宅（フルリモート）または本社",
      workHoursText: "10:00〜19:00（フレックスタイム制）",
      holidaysText: "完全週休2日（土日祝）",
      salaryType: "ANNUAL" as const,
      salaryMin: 4200000,
      salaryMax: 6000000,
      insurance: ["EMPLOYMENT", "WORKERS_COMP", "HEALTH", "PENSION"],
      daysAgo: 7,
    },
  ];
  for (const { daysAgo, ...job } of jobs) {
    const publishedAt = new Date(now - daysAgo * DAY);
    const data = { ...baseJob, ...job };
    const created = await db.jobPost.create({
      data: {
        ...data,
        status: "PUBLISHED",
        version: 1,
        complianceConfirmedAt: publishedAt,
        publishedAt,
        contentUpdatedAt: publishedAt,
        expiresAt: new Date(publishedAt.getTime() + 60 * DAY),
      },
    });
    await db.jobPostRevision.create({
      data: { jobPostId: created.id, version: 1, snapshot: data, changedFields: [] },
    });
  }

  // ---- 求職者 ----
  const seeker = await upsertUser("seeker@axis.example", "PERSON", passwordHash);
  await db.personalAxis.upsert({
    where: { userId: seeker.id },
    update: {},
    create: { userId: seeker.id },
  });
  await db.seekerProfile.upsert({
    where: { userId: seeker.id },
    update: {},
    create: {
      userId: seeker.id,
      displayName: "はるか",
      desiredCategories: ["FOOD", "RETAIL"],
      desiredPrefectures: ["東京都"],
      experience: "カフェでのアルバイト2年（レジ・ドリンク）",
      selfIntroduction: "人と話すのが好きです。平日の昼に働ける仕事をさがしています。",
    },
  });
  await db.seekerPost.deleteMany({ where: { seekerId: seeker.id } });
  await db.seekerPost.create({
    data: {
      seekerId: seeker.id,
      title: "平日の昼に、接客のお仕事をさがしています",
      body: "カフェでのアルバイト経験が2年あります。平日の10時〜16時に、週3日くらい働けるところをさがしています。",
      desiredCategory: "FOOD",
      desiredPrefecture: "東京都",
      employmentTypes: ["PART_TIME"],
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  // ---- 001 の紹介会社（ENABLE_AGENCY_PILOT=true のときだけ） ----
  if (process.env.ENABLE_AGENCY_PILOT === "true") {
    const name = "検証用キャリア紹介株式会社";
    const agency =
      (await db.agency.findFirst({ where: { name } })) ??
      (await db.agency.create({ data: { name } }));
    const staff: { email: string; role: AgencyRole }[] = [
      { email: "admin@agency.example", role: "ADMIN" },
      { email: "ca1@agency.example", role: "CA" },
    ];
    for (const s of staff) {
      const user = await upsertUser(s.email, "STAFF", passwordHash);
      await db.agencyMember.upsert({
        where: { agencyId_userId: { agencyId: agency.id, userId: user.id } },
        update: { role: s.role, active: true },
        create: { agencyId: agency.id, userId: user.id, role: s.role },
      });
    }
  }

  console.log(
    "シード完了: ops@axis.example / cafe@axis.example / tech@axis.example / seeker@axis.example（求人6件）",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
