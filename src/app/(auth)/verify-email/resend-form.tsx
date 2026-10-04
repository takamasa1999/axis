"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendVerificationAction } from "../actions";

export function ResendForm({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await resendVerificationAction({ email });
          setSent(true);
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "送信しています…" : "確認メールを送り直す"}
      </Button>
      {sent && (
        <p className="text-sm">ご登録のメールアドレスであれば、確認メールを送り直しました。</p>
      )}
    </form>
  );
}
