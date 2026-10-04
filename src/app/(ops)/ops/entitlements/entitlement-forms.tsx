"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { endEntitlementAction, grantEntitlementAction } from "../actions";

export function GrantForm() {
  const [email, setEmail] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="pop-card flex flex-wrap items-end gap-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await grantEntitlementAction({ email, endsAt: endsAt || undefined });
          if (r.ok) {
            toast.success("利用権を付与しました");
            setEmail("");
          } else toast.error(r.error.message);
        });
      }}
    >
      <label className="space-y-1 text-sm font-bold">
        求職者のメールアドレス
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="space-y-1 text-sm font-bold">
        終了日（任意）
        <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
      </label>
      <Button type="submit" disabled={pending}>
        付与する
      </Button>
    </form>
  );
}

export function EndButton({ entitlementId }: { entitlementId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        startTransition(async () => void (await endEntitlementAction({ entitlementId })))
      }
    >
      終了する
    </Button>
  );
}
