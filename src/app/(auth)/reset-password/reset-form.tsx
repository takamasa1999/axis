"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { PASSWORD_MIN } from "@/lib/common-passwords";

export function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <p className="text-sm leading-7">
        パスワードを変更しました。
        <Link href="/login" className="text-link underline">
          ログイン
        </Link>
        してください。
      </p>
    );
  }
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const { error } = await authClient.resetPassword({ newPassword: password, token });
        setPending(false);
        if (error)
          setError(
            error.message ?? "変更できませんでした。リンクの有効期限が切れている可能性があります",
          );
        else setDone(true);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="password">新しいパスワード（{PASSWORD_MIN}文字以上）</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={PASSWORD_MIN}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "変更しています…" : "パスワードを変更する"}
      </Button>
      {error && (
        <p role="alert" className="text-sm font-bold text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
