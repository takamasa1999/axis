import "server-only";
import { DomainError } from "@/lib/result";
import { recordAudit } from "@/server/audit";
import { db } from "@/server/db";

/**
 * DB の件数による回数制限（T021 / research R7・FR-037）。ECS のタスクが複数でも正確に数えられる。
 * 上限を超えたら止め、操作履歴に RATE_LIMITED を残す（運営の画面に表示される）。
 */
export const BOARD_LIMITS = {
  message: { max: 30, windowMinutes: 10, label: "メッセージ" },
  newConversation: { max: 20, windowMinutes: 24 * 60, label: "新しい会話" },
  jobPublish: { max: 10, windowMinutes: 24 * 60, label: "求人の公開" },
  inquiry: { max: 5, windowMinutes: 60, label: "お問い合わせ" },
} as const;

type LimitName = keyof typeof BOARD_LIMITS;

const since = (name: LimitName) =>
  new Date(Date.now() - BOARD_LIMITS[name].windowMinutes * 60 * 1000);

async function count(name: LimitName, key: string): Promise<number> {
  switch (name) {
    case "message":
      return db.message.count({
        where: { senderId: key, kind: "USER", createdAt: { gte: since(name) } },
      });
    case "newConversation":
      return db.conversation.count({
        where: { OR: [{ seekerId: key }, { employerId: key }], createdAt: { gte: since(name) } },
      });
    case "jobPublish":
      return db.auditEvent.count({
        where: { actorUserId: key, type: "JOB_PUBLISHED", occurredAt: { gte: since(name) } },
      });
    case "inquiry":
      return db.inquiry.count({ where: { email: key, receivedAt: { gte: since(name) } } });
  }
}

/** 上限に達していたら DomainError（RATE_LIMITED）を投げる。key は利用者 ID（お問い合わせはメールアドレス） */
export async function assertWithinLimit(name: LimitName, key: string, actorUserId?: string) {
  const limit = BOARD_LIMITS[name];
  if ((await count(name, key)) < limit.max) return;
  await recordAudit({
    type: "RATE_LIMITED",
    actorUserId: actorUserId ?? null,
    metadata: { itemCount: limit.max },
  });
  throw new DomainError(
    "RATE_LIMITED",
    `${limit.label}の回数が上限に達しました。時間をおいてからお試しください`,
  );
}
