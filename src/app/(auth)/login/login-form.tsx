"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const { error } = await authClient.signIn.email({ email, password });
        setPending(false);
        if (error) {
          if (error.status === 403) {
            setError(
              "メールアドレスの確認が終わっていません。確認メールを送り直したので、リンクを開いてください。",
            );
          } else if (error.status === 429) {
            setError(error.message ?? "しばらく時間をおいてからお試しください");
          } else {
            setError("メールアドレスまたはパスワードが違います");
          }
          return;
        }
        router.push(
          (next ? `/welcome?next=${encodeURIComponent(next)}` : "/welcome") as "/welcome",
        );
        router.refresh();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">パスワード</Label>
        <Input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "確認しています…" : "ログイン"}
      </Button>
      {error && (
        <p role="alert" className="text-sm font-bold text-destructive">
          {error}
        </p>
      )}
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="text-link underline">
          パスワードを忘れた
        </Link>
      </p>
    </form>
  );
}
