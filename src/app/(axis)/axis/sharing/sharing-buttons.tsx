"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { endRelationshipAction, revokeConsentAction } from "../actions";

export function RevokeButton({ consentId }: { consentId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (
            !window.confirm("共有を取り消しますか？取り消すと、担当者は内容を見られなくなります。")
          )
            return;
          const result = await revokeConsentAction({ consentId });
          if (result.ok) toast.success("共有を取り消しました");
          else toast.error(result.error.message);
        })
      }
    >
      共有を取り消す
    </Button>
  );
}

export function EndRelationshipButton({
  relationshipId,
  agencyName,
}: {
  relationshipId: string;
  agencyName: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (
            !window.confirm(
              `${agencyName} との関係を終了しますか？共有している内容は見られなくなります。あなたの記録は残ります。`,
            )
          )
            return;
          const result = await endRelationshipAction({ relationshipId });
          if (result.ok) toast.success("関係を終了しました");
          else toast.error(result.error.message);
        })
      }
    >
      この紹介会社との関係を終了する
    </Button>
  );
}
