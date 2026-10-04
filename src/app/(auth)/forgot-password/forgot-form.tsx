"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  if (state === "sent") {
    // 登録の有無を明かさないよう、結果にかかわらず同じ表示にする（FR-005）
    return (
      <p className="text-sm leading-7">
        ご登録のメールアドレスであれば、再設定用のリンクを送りました。メールを確認してください（有効期限は1時間です）。
      </p>
    );
  }
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("sending");
        await authClient
          .requestPasswordReset({ email, redirectTo: "/reset-password" })
          .catch(() => undefined);
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
      <Button type="submit" size="lg" className="w-full" disabled={state === "sending"}>
        {state === "sending" ? "送信しています…" : "再設定のリンクを送る"}
      </Button>
    </form>
  );
}
