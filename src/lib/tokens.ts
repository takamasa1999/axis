import { createHash, randomBytes } from "node:crypto";

/** 利用案内のトークン。DB にはハッシュだけを保存する */
export function generateToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 画面表示用にメールアドレスを一部伏せる（例: ta***@example.com） */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}
