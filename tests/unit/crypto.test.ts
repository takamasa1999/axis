import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

const key = () => randomBytes(32).toString("base64");

async function load(envKey: string) {
  vi.resetModules();
  process.env.MESSAGE_ENCRYPTION_KEY = envKey;
  return import("@/server/crypto/message");
}

describe("メッセージ本文の暗号化（T018）", () => {
  const original = process.env.MESSAGE_ENCRYPTION_KEY;
  afterEach(() => {
    process.env.MESSAGE_ENCRYPTION_KEY = original;
  });

  it("暗号化した本文は平文を含まず、復号すると元に戻る", async () => {
    const m = await load(`v1:${key()}`);
    const plain = "はじめまして。面接の日程について相談させてください。";
    const stored = m.encryptMessage(plain);
    expect(stored).not.toContain("面接");
    expect(stored.startsWith("v1:")).toBe(true);
    expect(m.decryptMessage(stored)).toBe(plain);
  });

  it("同じ本文でも毎回ちがう暗号文になる", async () => {
    const m = await load(`v1:${key()}`);
    expect(m.encryptMessage("同じ")).not.toBe(m.encryptMessage("同じ"));
  });

  it("改ざんされた暗号文は復号できない", async () => {
    const m = await load(`v1:${key()}`);
    const parts = m.encryptMessage("本文").split(":");
    parts[3] = Buffer.from("ちがう").toString("base64");
    expect(() => m.decryptMessage(parts.join(":"))).toThrow();
  });

  it("鍵を入れ替えても、古い世代の鍵が残っていれば古いメッセージを読める", async () => {
    const v1 = key();
    const old = await load(`v1:${v1}`);
    const storedWithV1 = old.encryptMessage("古いメッセージ");
    const rotated = await load(`v2:${key()},v1:${v1}`);
    expect(rotated.decryptMessage(storedWithV1)).toBe("古いメッセージ");
    expect(rotated.encryptMessage("新しい").startsWith("v2:")).toBe(true);
  });
});
