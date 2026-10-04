"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  hideJobAction,
  hideSeekerPostAction,
  requestJobFixAction,
  setReportStatusAction,
  suspendUserAction,
} from "../../actions";
import { ReasonAction } from "../../reason-action";

export function ReportActions({
  reportId,
  targetType,
  targetId,
  ownerId,
}: {
  reportId: string;
  targetType: "JOB_POST" | "SEEKER_POST" | "MESSAGE" | "USER";
  targetId: string;
  ownerId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const status = (s: "IN_REVIEW" | "RESOLVED" | "DISMISSED") =>
    startTransition(async () => {
      const r = await setReportStatusAction({ reportId, status: s });
      if (r.ok) toast.success("状態を変更しました");
      else toast.error(r.error.message);
    });

  return (
    <section className="pop-card space-y-4 p-5">
      <h2 className="font-bold">対応</h2>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => status("IN_REVIEW")}
        >
          対応中にする
        </Button>
        <Button size="sm" variant="mint" disabled={pending} onClick={() => status("RESOLVED")}>
          対応済みにする
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => status("DISMISSED")}>
          対応不要にする
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {targetType === "JOB_POST" && (
          <>
            <ReasonAction
              label="修正を依頼"
              placeholder="例：実際の業務内容と異なる記載があるため（企業にメールで送られます）"
              onRun={(reason) =>
                requestJobFixAction({ jobId: targetId, reason, days: 3, reportId })
              }
            />
            <ReasonAction
              label="求人を非公開"
              variant="destructive"
              onRun={(reason) => hideJobAction({ jobId: targetId, reason, reportId })}
            />
          </>
        )}
        {targetType === "SEEKER_POST" && (
          <ReasonAction
            label="投稿を非公開"
            variant="destructive"
            onRun={(reason) => hideSeekerPostAction({ postId: targetId, reason, reportId })}
          />
        )}
        {ownerId && (
          <ReasonAction
            label="アカウントを停止"
            variant="destructive"
            onRun={(reason) => suspendUserAction({ userId: ownerId, reason, reportId })}
          />
        )}
      </div>
    </section>
  );
}
