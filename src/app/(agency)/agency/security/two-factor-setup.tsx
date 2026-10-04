"use client";

import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function TwoFactorSetup() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!qr) {
    return (
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError(null);
          const { data, error } = await authClient.twoFactor.enable({ password });
          setPending(false);
          if (error || !data || data.method !== "totp") {
            setError("パスワードが違います");
            return;
          }
          setQr(await QRCode.toDataURL(data.totpURI));
          setSecret(new URL(data.totpURI).searchParams.get("secret"));
          setBackupCodes(data.backupCodes);
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="password">確認のため、パスワードを入力してください</Label>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "準備しています…" : "設定を始める"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    );
  }

  return (
    <form
      className="mt-6 space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const { error } = await authClient.twoFactor.verifyTotp({ code });
        setPending(false);
        if (error) {
          setError("コードが違います。もう一度お試しください");
          return;
        }
        router.push("/agency/seekers");
        router.refresh();
      }}
    >
      <div className="space-y-2 text-sm">
        <p>1. 認証アプリで、次の QR コードを読み取ってください。</p>
        {/* biome-ignore lint/performance/noImgElement: data URL の QR コードは next/image で最適化しない */}
        <img
          src={qr}
          alt="二要素認証の QR コード"
          width={200}
          height={200}
          className="rounded border"
        />
        {secret && (
          <p className="text-xs text-muted-foreground">
            読み取れない場合はキーを入力：<code className="break-all">{secret}</code>
          </p>
        )}
      </div>
      <div className="space-y-2 text-sm">
        <p>
          2.
          バックアップコードを安全な場所に保管してください（認証アプリが使えなくなったときに使います）。
        </p>
        <ul className="grid grid-cols-2 gap-1 rounded border bg-muted/40 p-3 font-mono text-xs">
          {backupCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
      <div className="space-y-2">
        <Label htmlFor="code">3. 認証アプリに表示された6桁のコード</Label>
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
      <Button type="submit" disabled={pending}>
        {pending ? "確認しています…" : "設定を完了する"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
