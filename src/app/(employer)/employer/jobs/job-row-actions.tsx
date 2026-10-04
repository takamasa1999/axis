"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { closeJobAction, extendJobAction } from "../../actions";

export function JobRowActions({ jobId, status }: { jobId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: { message: string } }>, done: string) =>
    startTransition(async () => {
      const result = await fn();
      if (result.ok) toast.success(done);
      else toast.error(result.error?.message ?? "うまくいきませんでした");
    });

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/employer/jobs/${jobId}/edit`}
        className={buttonVariants({ size: "sm", variant: "outline" })}
      >
        編集
      </Link>
      {(status === "PUBLISHED" || status === "CLOSED" || status === "EXPIRED") && (
        <Link href={`/jobs/${jobId}`} className={buttonVariants({ size: "sm", variant: "ghost" })}>
          公開ページ
        </Link>
      )}
      {(status === "PUBLISHED" || status === "EXPIRED") && (
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => run(() => extendJobAction({ jobId }), "掲載期限を60日後まで延ばしました")}
        >
          延長する
        </Button>
      )}
      {status === "PUBLISHED" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (
              window.confirm(
                "募集を終了しますか？一覧に表示されなくなります（やり取り中のメッセージは続けられます）",
              )
            ) {
              run(() => closeJobAction({ jobId }), "募集を終了しました");
            }
          }}
        >
          募集を終了
        </Button>
      )}
    </div>
  );
}
