"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendInvitationAction } from "../../actions";

export function InvitationForm({
  agencyId,
  defaultCaId,
  cas,
}: {
  agencyId: string;
  defaultCaId: string | null;
  cas: { id: string; name: string }[];
}) {
  const [email, setEmail] = useState("");
  const [caId, setCaId] = useState<string>(defaultCaId ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await sendInvitationAction({
            agencyId,
            email,
            assignedCaId: caId || null,
          });
          if (result.ok) {
            toast.success(`${email} に案内を送りました`);
            setEmail("");
          } else {
            toast.error(result.error.message);
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="email">求職者のメールアドレス</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ca">担当CA</Label>
        <select
          id="ca"
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          value={caId}
          onChange={(e) => setCaId(e.target.value)}
        >
          <option value="">未設定（管理者のみ閲覧可）</option>
          {cas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "送信しています…" : "案内を送る"}
      </Button>
    </form>
  );
}
