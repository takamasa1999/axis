-- 1つの関係につき「有効な許可」（取り消し・置き換えされていない許可）は最大1つ（data-model.md SharingConsent のルール）
-- Prisma のスキーマでは部分インデックスを表せないため、SQL で定義する
CREATE UNIQUE INDEX "sharing_consents_one_active_per_relationship"
  ON "sharing_consents" ("relationshipId")
  WHERE "revokedAt" IS NULL AND "supersededAt" IS NULL;
