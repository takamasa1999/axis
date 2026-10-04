"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { acceptInvitationAction } from "./actions";

export function AcceptInvitation({
  token,
  maskedEmail,
}: {
  token: string;
  maskedEmail: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (sentTo) {
    return (
      <p className="rounded-lg border bg-muted/40 p-4 text-sm leading-6">
        {sentTo} にログイン用のリンクを送りました。メールのリンクを開くと、Axis
        を使い始められます（有効期限は15分です）。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {maskedEmail && (
        <p className="text-sm text-muted-foreground">登録するメールアドレス: {maskedEmail}</p>
      )}
      <Button
        className="w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await acceptInvitationAction({ token });
            if (result.ok) setSentTo(result.data.maskedEmail);
            else setError(result.error.message);
          })
        }
      >
        {pending ? "登録しています…" : "同意して登録する"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
