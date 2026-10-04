"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormField, Select } from "@/components/board/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { JOB_CATEGORIES, PREFECTURES } from "@/lib/master-data";
import { cn } from "@/lib/utils";
import { saveSeekerProfileAction } from "../../actions";

type Values = {
  displayName: string;
  desiredCategories: string[];
  desiredPrefectures: string[];
  experience: string;
  qualifications: string;
  selfIntroduction: string;
};

export function SeekerProfileForm({ initial, next }: { initial: Values; next?: string }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();
  const set = (k: keyof Values) => (e: { target: { value: string } }) =>
    setV((p) => ({ ...p, [k]: e.target.value }));
  const toggle = (k: "desiredCategories", value: string) =>
    setV((p) => ({
      ...p,
      [k]: p[k].includes(value) ? p[k].filter((x) => x !== value) : [...p[k], value].slice(0, 5),
    }));

  return (
    <form
      className="pop-card space-y-6 p-5 sm:p-7"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await saveSeekerProfileAction(v as never);
          if (result.ok) {
            toast.success("保存しました");
            router.push((next?.startsWith("/") ? next : "/me") as "/me");
            router.refresh();
          } else {
            setErrors(result.error.fieldErrors ?? {});
            toast.error(result.error.message);
          }
        });
      }}
    >
      <FormField
        id="displayName"
        label="表示名"
        required
        hint="ニックネームでもOK。企業とのメッセージで表示されます。"
        error={errors.displayName?.[0]}
      >
        <Input
          id="displayName"
          value={v.displayName}
          onChange={set("displayName")}
          maxLength={30}
        />
      </FormField>
      <fieldset className="space-y-2">
        <legend className="font-bold">興味のある職種（5つまで）</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(JOB_CATEGORIES).map(([k, c]) => (
            <button
              key={k}
              type="button"
              aria-pressed={v.desiredCategories.includes(k)}
              onClick={() => toggle("desiredCategories", k)}
              className={cn(
                "rounded-full border-2 border-ink px-3 py-1 text-sm font-bold",
                v.desiredCategories.includes(k) ? "bg-sun text-[#1e1b2e]" : "bg-card",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>
      <FormField id="desiredPrefectures" label="働きたい場所" hint="いちばん希望する都道府県">
        <Select
          id="desiredPrefectures"
          value={v.desiredPrefectures[0] ?? ""}
          onChange={(e) =>
            setV((p) => ({ ...p, desiredPrefectures: e.target.value ? [e.target.value] : [] }))
          }
        >
          <option value="">選ばない</option>
          {PREFECTURES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </Select>
      </FormField>
      <FormField
        id="experience"
        label="これまでの経験"
        hint="任意。アルバイトや家事・ボランティアの経験も立派な経験です。"
      >
        <Textarea
          id="experience"
          value={v.experience}
          onChange={set("experience")}
          maxLength={2000}
        />
      </FormField>
      <FormField id="qualifications" label="資格・スキル" hint="任意">
        <Textarea
          id="qualifications"
          value={v.qualifications}
          onChange={set("qualifications")}
          maxLength={1000}
          rows={2}
        />
      </FormField>
      <FormField id="selfIntroduction" label="自己紹介" hint="任意。どんな働き方をしたいかなど。">
        <Textarea
          id="selfIntroduction"
          value={v.selfIntroduction}
          onChange={set("selfIntroduction")}
          maxLength={2000}
        />
      </FormField>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "保存しています…" : "保存する"}
      </Button>
    </form>
  );
}
