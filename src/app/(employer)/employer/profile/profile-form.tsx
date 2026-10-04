"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormField, Select } from "@/components/board/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PREFECTURES } from "@/lib/master-data";
import { saveEmployerProfileAction } from "../../actions";

type Values = {
  companyName: string;
  prefecture: string;
  address: string;
  businessDescription: string;
  contactName: string;
  websiteUrl: string;
  corporateNumber: string;
};

export function ProfileForm({ initial, next }: { initial: Values; next?: string }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();
  const set = (k: keyof Values) => (e: { target: { value: string } }) =>
    setV((p) => ({ ...p, [k]: e.target.value }));

  return (
    <form
      className="pop-card space-y-5 p-5 sm:p-7"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await saveEmployerProfileAction(v as never);
          if (result.ok) {
            toast.success("保存しました");
            router.push((next?.startsWith("/") ? next : "/employer") as "/employer");
            router.refresh();
          } else {
            setErrors(result.error.fieldErrors ?? {});
            toast.error(result.error.message);
          }
        });
      }}
    >
      <FormField
        id="companyName"
        label="企業名・お店の名前"
        required
        error={errors.companyName?.[0]}
      >
        <Input
          id="companyName"
          value={v.companyName}
          onChange={set("companyName")}
          maxLength={100}
        />
      </FormField>
      <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
        <FormField id="prefecture" label="都道府県" required error={errors.prefecture?.[0]}>
          <Select id="prefecture" value={v.prefecture} onChange={set("prefecture")}>
            <option value="">選んでください</option>
            {PREFECTURES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </FormField>
        <FormField id="address" label="所在地" required error={errors.address?.[0]}>
          <Input
            id="address"
            value={v.address}
            onChange={set("address")}
            maxLength={200}
            placeholder="例：渋谷区神南1-2-3"
          />
        </FormField>
      </div>
      <FormField
        id="businessDescription"
        label="どんな会社・お店ですか？"
        required
        hint="事業の内容や雰囲気を、気軽に書いてください。"
        error={errors.businessDescription?.[0]}
      >
        <Textarea
          id="businessDescription"
          value={v.businessDescription}
          onChange={set("businessDescription")}
          maxLength={2000}
        />
      </FormField>
      <FormField
        id="contactName"
        label="採用担当の方のお名前"
        hint="任意。メッセージの相手に表示されます。"
      >
        <Input
          id="contactName"
          value={v.contactName}
          onChange={set("contactName")}
          maxLength={50}
        />
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="websiteUrl" label="ホームページ" hint="任意" error={errors.websiteUrl?.[0]}>
          <Input
            id="websiteUrl"
            type="url"
            value={v.websiteUrl}
            onChange={set("websiteUrl")}
            placeholder="https://"
          />
        </FormField>
        <FormField
          id="corporateNumber"
          label="法人番号"
          hint="任意（13桁）"
          error={errors.corporateNumber?.[0]}
        >
          <Input
            id="corporateNumber"
            inputMode="numeric"
            value={v.corporateNumber}
            onChange={set("corporateNumber")}
            maxLength={13}
          />
        </FormField>
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "保存しています…" : "保存する"}
      </Button>
    </form>
  );
}
