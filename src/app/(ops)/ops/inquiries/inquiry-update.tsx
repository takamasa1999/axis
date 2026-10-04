"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Select } from "@/components/board/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateInquiryAction } from "../actions";

export function InquiryUpdate({
  inquiryId,
  status: initial,
}: {
  inquiryId: string;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED";
}) {
  const [status, setStatus] = useState(initial === "OPEN" ? "IN_PROGRESS" : initial);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await updateInquiryAction({ inquiryId, status, note });
          if (r.ok) {
            toast.success("記録しました");
            setNote("");
          } else toast.error(r.error.message);
        });
      }}
    >
      <Select
        aria-label="状態"
        value={status}
        onChange={(e) => setStatus(e.target.value as typeof status)}
        className="w-40"
      >
        <option value="IN_PROGRESS">対応中</option>
        <option value="CLOSED">完了</option>
        <option value="OPEN">未対応</option>
      </Select>
      <Input
        aria-label="経過"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="対応の経過（例：メールで回答）"
        className="min-w-60 flex-1"
      />
      <Button type="submit" size="sm" disabled={pending || !note.trim()}>
        記録する
      </Button>
    </form>
  );
}
