"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteSavedSearchAction, updateSavedSearchAction } from "../../actions";

export function SearchRowActions({ id, notify }: { id: string; notify: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant={notify ? "mint" : "outline"}
        aria-pressed={notify}
        disabled={pending}
        onClick={() =>
          startTransition(async () => void (await updateSavedSearchAction({ id, notify: !notify })))
        }
      >
        メール通知 {notify ? "オン" : "オフ"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await deleteSavedSearchAction({ id });
            if (r.ok) toast.success("削除しました");
          })
        }
      >
        削除
      </Button>
    </div>
  );
}
