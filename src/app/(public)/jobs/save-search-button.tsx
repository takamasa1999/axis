"use client";

import { BellPlus } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { saveSearchAction } from "@/app/(seeker)/actions";
import { Button } from "@/components/ui/button";
import type { SearchParams } from "@/server/domain/job-search";

/** いまの条件を保存し、条件に合う新着求人をメールで受け取る（FR-020） */
export function SaveSearchButton({ params }: { params: SearchParams }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const clean = Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined),
          );
          const result = await saveSearchAction(clean);
          if (result.ok)
            toast.success("この条件を保存しました。新着があれば朝にメールでお知らせします");
          else toast.error(result.error.message);
        })
      }
    >
      <BellPlus /> この条件で新着を受け取る
    </Button>
  );
}
