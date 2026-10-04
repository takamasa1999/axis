"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ReflectionAspect } from "@/generated/prisma/enums";
import { ASPECT_LABEL } from "@/lib/labels";
import { saveReflectionAction } from "../../../actions";

type Section = { aspect: ReflectionAspect; content: string; isSensitive: boolean };

export function ReflectionEditor({
  summaryId,
  versionId,
  sections: initial,
}: {
  summaryId: string;
  versionId: string;
  sections: Section[];
}) {
  const [editing, setEditing] = useState(false);
  const [sections, setSections] = useState(initial);
  const [pending, startTransition] = useTransition();

  const update = (aspect: ReflectionAspect, patch: Partial<Section>) =>
    setSections((prev) => prev.map((s) => (s.aspect === aspect ? { ...s, ...patch } : s)));

  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <Card key={s.aspect}>
          <CardHeader>
            <CardTitle className="text-base">{ASPECT_LABEL[s.aspect]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <>
                <Textarea
                  aria-label={ASPECT_LABEL[s.aspect]}
                  rows={5}
                  maxLength={2000}
                  value={s.content}
                  onChange={(e) => update(s.aspect, { content: e.target.value })}
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`sensitive-${s.aspect}`}
                    checked={s.isSensitive}
                    onCheckedChange={(v) => update(s.aspect, { isSensitive: v === true })}
                  />
                  <Label htmlFor={`sensitive-${s.aspect}`} className="text-sm font-normal">
                    他の人に見せたくない内容を含む
                  </Label>
                </div>
              </>
            ) : (
              <>
                <p className="whitespace-pre-wrap text-sm leading-7">{s.content}</p>
                {s.isSensitive && (
                  <p className="text-xs text-amber-700">
                    機微な内容を含む可能性があります。共有するときは注意してください。
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-2">
        {editing ? (
          <>
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await saveReflectionAction({
                    summaryId,
                    baseVersionId: versionId,
                    sections,
                  });
                  if (result.ok) {
                    toast.success(`保存しました（版 ${result.data.versionNo}）`);
                    setEditing(false);
                  } else {
                    toast.error(result.error.message);
                  }
                })
              }
            >
              {pending ? "保存しています…" : "保存する"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setSections(initial);
                setEditing(false);
              }}
            >
              やめる
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => setEditing(true)}>
            修正する
          </Button>
        )}
      </div>
    </div>
  );
}
