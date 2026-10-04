"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { acceptInvitationAction } from "./actions";

/** 001 の紹介会社からの案内の受け入れ（ENABLE_AGENCY_PILOT=true のときだけ表示される） */
export function AcceptInvitation({ token, signedIn }: { token: string; signedIn: boolean }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const next = encodeURIComponent(`/invite/${token}`);

  if (!signedIn) {
    return (
      <div className="flex flex-wrap gap-3">
        <Link href={`/signup?next=${next}` as "/signup"} className={buttonVariants()}>
          登録して続ける
        </Link>
        <Link
          href={`/login?next=${next}` as "/login"}
          className={buttonVariants({ variant: "outline" })}
        >
          ログインして続ける
        </Link>
      </div>
    );
  }
  if (done) {
    return (
      <p className="pop-card p-4 text-sm">
        {done} とつながりました。Axis エンジンから対話を始められます。
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await acceptInvitationAction({ token });
            if (result.ok) setDone(result.data.agencyName);
            else setError(result.error.message);
          })
        }
      >
        {pending ? "つないでいます…" : "同意してつながる"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
