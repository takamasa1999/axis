"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { unpublishSeekerPostAction } from "../../actions";

export function UnpublishButton({ postId }: { postId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await unpublishSeekerPostAction({ postId });
          if (r.ok) toast.success("非公開にしました（始まったやり取りは続けられます）");
          else toast.error(r.error.message);
        })
      }
    >
      非公開にする
    </Button>
  );
}
