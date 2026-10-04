import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

/**
 * メッセージ本文の暗号化（T018 / research R6）。
 * AES-256-GCM。保存形式は `世代:iv:tag:暗号文`（各 base64）。
 * 鍵は MESSAGE_ENCRYPTION_KEY（「世代:鍵」のカンマ区切り。先頭が現在の鍵）。古い世代の鍵を残せば、古いメッセージも復号できる。
 * DB を直接見られる立場の人でも、鍵がなければ本文を読めない（通信の秘密、原則VII）。
 */

type Key = { id: string; key: Buffer };

function parseKeys(raw: string): Key[] {
  return raw.split(",").map((pair) => {
    const [id, b64] = pair.split(":");
    const key = Buffer.from(b64, "base64");
    if (key.length !== 32)
      throw new Error(`MESSAGE_ENCRYPTION_KEY（${id}）は32バイトである必要があります`);
    return { id, key };
  });
}

let cache: { raw: string; keys: Key[] } | undefined;
function keys(): Key[] {
  const raw = env().MESSAGE_ENCRYPTION_KEY;
  if (cache?.raw !== raw) cache = { raw, keys: parseKeys(raw) };
  return cache.keys;
}

export function encryptMessage(plain: string): string {
  const { id, key } = keys()[0];
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [id, iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(
    ":",
  );
}

export function decryptMessage(stored: string): string {
  const [id, ivB64, tagB64, dataB64] = stored.split(":");
  const entry = keys().find((k) => k.id === id);
  if (!entry || !ivB64 || !tagB64 || dataB64 === undefined) {
    throw new Error("メッセージを復号できません（鍵の世代が見つからないか、形式が不正です）");
  }
  const decipher = createDecipheriv("aes-256-gcm", entry.key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
