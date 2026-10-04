"use client";

import { Building2, UserRound } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_MIN } from "@/lib/common-passwords";
import { cn } from "@/lib/utils";
import { signUpAction } from "../actions";

type Kind = "PERSON" | "EMPLOYER";

export function SignUpForm({ next, initialKind }: { next?: string; initialKind?: Kind }) {
  const [kind, setKind] = useState<Kind | undefined>(initialKind);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [adult, setAdult] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (sentTo) {
    return (
      <div className="space-y-3 text-sm leading-7">
        <p className="text-4xl" aria-hidden>
          📮
        </p>
        <p>
          <strong>{sentTo}</strong>{" "}
          に確認メールを送りました。メールのリンクを開くと登録が完了し、そのまま使い始められます。
        </p>
        <p className="text-muted-foreground">
          届かないときは、迷惑メールのフォルダも確認してください。
          <Link
            href={`/verify-email?email=${encodeURIComponent(sentTo)}` as "/verify-email"}
            className="text-link underline"
          >
            確認メールを送り直す
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!kind) return;
        setError(null);
        startTransition(async () => {
          const result = await signUpAction({
            kind,
            email,
            password,
            agreeTerms: agree as true,
            confirmAge: kind === "PERSON" ? adult : undefined,
            next,
          });
          if (result.ok) setSentTo(result.data.email);
          else
            setError(Object.values(result.error.fieldErrors ?? {})[0]?.[0] ?? result.error.message);
        });
      }}
    >
      <fieldset className="space-y-2">
        <legend className="font-bold">どちらで使いますか？</legend>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              {
                value: "PERSON",
                label: "仕事をさがす",
                sub: "求職者",
                Icon: UserRound,
                tone: "bg-mint",
              },
              {
                value: "EMPLOYER",
                label: "人をさがす",
                sub: "企業・お店",
                Icon: Building2,
                tone: "bg-sun",
              },
            ] as const
          ).map(({ value, label, sub, Icon, tone }) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
              className={cn(
                "pop-press flex flex-col items-center gap-1 rounded-2xl border-2 border-ink p-4 text-center shadow-pop-sm",
                kind === value ? `${tone} text-[#1e1b2e]` : "bg-card",
              )}
            >
              <Icon className="size-8" aria-hidden />
              <span className="font-bold">{label}</span>
              <span className="text-xs">{sub}</span>
            </button>
          ))}
        </div>
      </fieldset>

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
      <div className="space-y-2">
        <Label htmlFor="password">パスワード（{PASSWORD_MIN}文字以上）</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={PASSWORD_MIN}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          「12345678」や「password」のような推測されやすいものは使えません。
        </p>
      </div>

      {kind === "PERSON" && (
        <div className="flex items-start gap-2">
          <Checkbox id="adult" checked={adult} onCheckedChange={(v) => setAdult(v === true)} />
          <Label htmlFor="adult" className="font-normal leading-6">
            18歳以上です
          </Label>
        </div>
      )}
      <div className="flex items-start gap-2">
        <Checkbox id="agree" checked={agree} onCheckedChange={(v) => setAgree(v === true)} />
        <Label htmlFor="agree" className="font-normal leading-6">
          <span>
            <Link href="/terms" target="_blank" className="text-link underline">
              利用規約
            </Link>
            と
            <Link href="/privacy" target="_blank" className="text-link underline">
              プライバシーポリシー
            </Link>
            に同意します
          </span>
        </Label>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={pending || !kind || !agree || (kind === "PERSON" && !adult)}
      >
        {pending ? "登録しています…" : "無料ではじめる"}
      </Button>
      {!kind && (
        <p className="text-center text-xs text-muted-foreground">
          まず「仕事をさがす」か「人をさがす」を選んでください
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm font-bold text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
