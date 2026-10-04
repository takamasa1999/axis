"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MilestoneKind } from "@/generated/prisma/enums";
import { MILESTONE_KIND_LABEL } from "@/lib/labels";
import { createMilestoneAction } from "../actions";

const KINDS = Object.keys(MILESTONE_KIND_LABEL) as MilestoneKind[];

export function NewMilestoneForm() {
  const [kind, setKind] = useState<MilestoneKind>("CAREER_CHANGE");
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">新しい節目を始める</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const result = await createMilestoneAction({ kind, title: title || undefined });
              if (result && !result.ok) setError(result.error.message);
            });
          }}
        >
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">どんな節目ですか？</legend>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <Button
                  key={k}
                  type="button"
                  size="sm"
                  variant={kind === k ? "default" : "outline"}
                  aria-pressed={kind === k}
                  onClick={() => setKind(k)}
                >
                  {MILESTONE_KIND_LABEL[k]}
                </Button>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="title">名前（任意）</Label>
            <Input
              id="title"
              placeholder="例：2026年 2回目の転職"
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "準備しています…" : "対話を始める"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
