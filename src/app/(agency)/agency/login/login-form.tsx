"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function AgencyLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"password" | "totp">("password");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = () => {
    router.push("/agency/seekers");
    router.refresh();
  };

  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        try {
          if (step === "password") {
            const { data, error } = await authClient.signIn.email({ email, password });
            if (error) throw new Error("メールアドレスまたはパスワードが違います");
            if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) setStep("totp");
            else done();
          } else {
            const { error } = await authClient.twoFactor.verifyTotp({ code });
            if (error) throw new Error("コードが違います");
            done();
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "ログインできませんでした");
        } finally {
          setPending(false);
        }
      }}
    >
      {step === "password" ? (
        <>
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
        </>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="code">認証アプリの6桁のコード</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "確認しています…" : step === "password" ? "次へ" : "ログイン"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
