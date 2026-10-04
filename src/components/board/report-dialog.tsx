"use client";

import { Flag } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { reportAction } from "@/app/(messages)/actions";
import { Select } from "@/components/board/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { REPORT_REASONS } from "@/lib/master-data";

type Target = "JOB_POST" | "SEEKER_POST" | "USER";

/** 求人・求職の投稿・アカウントの通報（FR-034）。メッセージの通報は会話の画面で行う */
export function ReportDialog({
  targetType,
  targetId,
  label = "通報する",
}: {
  targetType: Target;
  targetId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<keyof typeof REPORT_REASONS>("FALSE_INFO");
  const [detail, setDetail] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        <Flag /> {label}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>運営に知らせる</DialogTitle>
          <DialogDescription>
            内容を運営が確認し、必要に応じて対応します。通報したことは相手に伝わりません。
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const result = await reportAction({
                targetType,
                targetId,
                reason,
                detail: detail || undefined,
              });
              if (result.ok) {
                toast.success("受け付けました。ご協力ありがとうございます");
                setOpen(false);
              } else toast.error(result.error.message);
            });
          }}
        >
          <label className="block space-y-1 text-sm font-bold">
            理由
            <Select
              value={reason}
              onChange={(e) => setReason(e.target.value as keyof typeof REPORT_REASONS)}
            >
              {Object.entries(REPORT_REASONS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </label>
          <label className="block space-y-1 text-sm font-bold">
            くわしく（任意）
            <Textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={2000}
              rows={3}
            />
          </label>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "送信しています…" : "送信する"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
