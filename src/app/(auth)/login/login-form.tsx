"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  if (state === "sent") {
    return (
      <p className="mt-8 rounded-lg border bg-muted/40 p-4 text-sm leading-6">
        ご登録のメールアドレスであれば、ログイン用のリンクを送りました。メールを確認してください（有効期限は15分です）。
      </p>
    );
  }

  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("sending");
        // 登録の有無を明かさないよう、結果にかかわらず同じ表示にする
        await authClient.signIn.magicLink({ email, callbackURL: "/home" }).catch(() => {});
        setState("sent");
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={state === "sending"}>
        {state === "sending" ? "送信しています…" : "ログインリンクを送る"}
      </Button>
    </form>
  );
}
