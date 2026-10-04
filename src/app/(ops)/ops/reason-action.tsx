"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** 理由を書いて実行する運営の操作（非公開・停止・修正依頼など） */
export function ReasonAction({
  label,
  variant = "outline",
  placeholder,
  onRun,
}: {
  label: string;
  variant?: "outline" | "destructive" | "default" | "secondary";
  placeholder?: string;
  onRun: (reason: string) => Promise<{ ok: boolean; error?: { message: string } }>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  if (!open) {
    return (
      <Button size="sm" variant={variant} onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }
  return (
    <div className="w-full space-y-2 rounded-xl border-2 border-ink p-3">
      <Textarea
        aria-label={`${label}の理由`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder={placeholder ?? "理由（記録に残ります）"}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={variant}
          disabled={pending || !reason.trim()}
          onClick={() =>
            startTransition(async () => {
              const r = await onRun(reason);
              if (r.ok) {
                toast.success(`${label}しました`);
                setOpen(false);
                setReason("");
              } else toast.error(r.error?.message ?? "失敗しました");
            })
          }
        >
          {label}を実行
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          やめる
        </Button>
      </div>
    </div>
  );
}
