/**
 * 回数制限（T026）。メモリ上のスライディングウィンドウ。
 * Phase1 は ECS のタスク数が少ない（最大3）ため、タスクごとの制限で十分とする。
 * タスク数を増やす場合は DB などの共有ストアに置き換える。
 */
type Rule = { limit: number; windowMs: number };

export const RATE_LIMITS = {
  /** 対話: 1人あたり1分に20回（contracts/server-interfaces.md） */
  dialogueMessage: { limit: 20, windowMs: 60_000 },
  /** 利用案内: 1社あたり1日100件 */
  invitation: { limit: 100, windowMs: 24 * 60 * 60_000 },
} satisfies Record<string, Rule>;

const buckets = new Map<string, number[]>();

export function checkRateLimit(
  name: keyof typeof RATE_LIMITS,
  key: string,
  now: number = Date.now(),
): { allowed: boolean; retryAfterMs: number } {
  const rule = RATE_LIMITS[name];
  const bucketKey = `${name}:${key}`;
  const recent = (buckets.get(bucketKey) ?? []).filter((t) => now - t < rule.windowMs);

  if (recent.length >= rule.limit) {
    buckets.set(bucketKey, recent);
    return { allowed: false, retryAfterMs: rule.windowMs - (now - recent[0]) };
  }
  recent.push(now);
  buckets.set(bucketKey, recent);
  return { allowed: true, retryAfterMs: 0 };
}

/** テスト用 */
export function resetRateLimits() {
  buckets.clear();
}
