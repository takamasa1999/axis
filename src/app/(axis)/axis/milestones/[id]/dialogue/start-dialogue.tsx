"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { startDialogueAction } from "../../../actions";

/** 対話を始める前の説明（FR-002） */
export function StartDialogue({ milestoneId, title }: { milestoneId: string; title: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}：対話を始める前に</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm leading-7">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>目的</strong>
            ：いまの気持ち、変えたい理由、大切にしたい判断軸、まだ分からないことを、言葉にして整理します。
          </li>
          <li>
            <strong>所要時間</strong>
            ：20〜30分ほどが目安です。途中でやめても、続きから再開できます。
          </li>
          <li>
            <strong>答えを決めるのはあなたです</strong>：Axis
            は問いを返したり、考える材料を示したりしますが、転職すべきかどうかは判定しません。
          </li>
          <li>
            <strong>共有はあなたの許可制です</strong>
            ：対話の内容は、あなたが許可するまで誰にも共有されません。対話の全文が共有されることはありません。
          </li>
        </ul>
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => void (await startDialogueAction({ milestoneId })))
          }
        >
          {pending ? "準備しています…" : "対話を始める"}
        </Button>
      </CardContent>
    </Card>
  );
}
