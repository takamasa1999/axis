"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { grantConsentAction } from "../../../../actions";

type Candidate = { id: string; label: string; content: string; isSensitive: boolean };

/** 項目の選択 → 確認 → 許可（FR-017, FR-018, FR-023）。既定ではどの項目も選ばない */
export function ShareForm({
  relationshipId,
  versionId,
  agencyName,
  candidates,
}: {
  relationshipId: string;
  versionId: string;
  agencyName: string;
  candidates: Candidate[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [pending, startTransition] = useTransition();
  const chosen = candidates.filter((c) => selected.includes(c.id));

  if (step === "confirm") {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{agencyName} の担当CA に、次の内容が見えます</h2>
        {chosen.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle className="text-base">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-7">{c.content}</p>
            </CardContent>
          </Card>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await grantConsentAction({
                  relationshipId,
                  versionId,
                  itemIds: selected,
                });
                if (result.ok) {
                  toast.success(`${agencyName} への共有を許可しました`);
                  router.push("/sharing");
                } else {
                  toast.error(result.error.message);
                }
              })
            }
          >
            {pending ? "許可しています…" : "この内容の共有を許可する"}
          </Button>
          <Button variant="ghost" onClick={() => setStep("select")}>
            選び直す
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {candidates.map((c) => {
        const checked = selected.includes(c.id);
        return (
          <Card key={c.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Checkbox
                  id={`item-${c.id}`}
                  checked={checked}
                  onCheckedChange={(v) =>
                    setSelected((prev) =>
                      v === true ? [...prev, c.id] : prev.filter((x) => x !== c.id),
                    )
                  }
                />
                <Label htmlFor={`item-${c.id}`} className="text-base font-semibold">
                  {c.label}
                </Label>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                {c.content}
              </p>
              {c.isSensitive && (
                <p className="text-xs text-amber-700">
                  機微な内容を含む可能性があります。共有してよいか、もう一度確かめてください。
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
      <Button disabled={selected.length === 0} onClick={() => setStep("confirm")}>
        確認へ進む（{selected.length} 項目）
      </Button>
      {selected.length === 0 && (
        <p className="text-xs text-muted-foreground">共有する項目を1つ以上選んでください。</p>
      )}
    </div>
  );
}
