"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormField, Select } from "@/components/board/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EMPLOYMENT_TYPES, JOB_CATEGORIES, PREFECTURES } from "@/lib/master-data";
import { cn } from "@/lib/utils";
import { CONTACT_INFO_LABEL, checkContactInfo } from "@/server/compliance/text-checks";
import { publishSeekerPostAction, saveSeekerPostAction } from "../../actions";

type Post = {
  title: string;
  body: string;
  desiredCategory: string | null;
  desiredPrefecture: string | null;
  employmentTypes: string[];
};

/** 求職の投稿（FR-031〜FR-033）。連絡先らしき文字列があれば、公開前に注意する */
export function PostForm({
  postId,
  initial,
  published,
}: {
  postId: string | null;
  initial: Post;
  published: boolean;
}) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [pending, startTransition] = useTransition();
  const warnings = checkContactInfo(`${p.title}\n${p.body}`);

  function save(publish: boolean) {
    startTransition(async () => {
      const saved = await saveSeekerPostAction({ postId, post: p as never });
      if (!saved.ok) {
        toast.error(saved.error.message);
        return;
      }
      if (publish && !published) {
        const acknowledge =
          warnings.length === 0 ||
          window.confirm(
            "連絡先らしき文字が含まれています。このまま公開しますか？（企業とはメッセージでやり取りできます）",
          );
        if (!acknowledge) return;
        const result = await publishSeekerPostAction({
          postId: saved.data.postId,
          acknowledgeWarnings: true,
        });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        toast.success("公開しました！企業から声がかかると、メッセージに届きます");
      } else toast.success("保存しました");
      router.push("/me/posts");
      router.refresh();
    });
  }

  return (
    <div className="pop-card space-y-5 p-5 sm:p-7">
      <FormField
        id="title"
        label="タイトル"
        required
        hint="例：平日の昼に、接客のお仕事をさがしています"
      >
        <Input
          id="title"
          value={p.title}
          onChange={(e) => setP({ ...p, title: e.target.value })}
          maxLength={60}
        />
      </FormField>
      <FormField
        id="body"
        label="どんな仕事をさがしていますか？"
        required
        hint="できること、働ける日や時間、大切にしたいことなど。連絡先は書かないでください。"
      >
        <Textarea
          id="body"
          value={p.body}
          onChange={(e) => setP({ ...p, body: e.target.value })}
          maxLength={2000}
          rows={6}
        />
      </FormField>
      {warnings.length > 0 && (
        <p className="flex items-start gap-2 rounded-xl border-2 border-ink bg-sun-soft p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {warnings.map((w) => CONTACT_INFO_LABEL[w]).join("・")}
          らしき文字が入っています。連絡先は書かないでください。企業とはメッセージでやり取りできます。
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="desiredCategory" label="職種">
          <Select
            id="desiredCategory"
            value={p.desiredCategory ?? ""}
            onChange={(e) => setP({ ...p, desiredCategory: e.target.value || null })}
          >
            <option value="">選ばない</option>
            {Object.entries(JOB_CATEGORIES).map(([k, c]) => (
              <option key={k} value={k}>
                {c.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="desiredPrefecture" label="働きたい場所">
          <Select
            id="desiredPrefecture"
            value={p.desiredPrefecture ?? ""}
            onChange={(e) => setP({ ...p, desiredPrefecture: e.target.value || null })}
          >
            <option value="">選ばない</option>
            {PREFECTURES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </FormField>
      </div>
      <fieldset className="space-y-2">
        <legend className="font-bold">希望する雇用形態</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(EMPLOYMENT_TYPES).map(([k, v]) => (
            <button
              key={k}
              type="button"
              aria-pressed={p.employmentTypes.includes(k)}
              onClick={() =>
                setP({
                  ...p,
                  employmentTypes: p.employmentTypes.includes(k)
                    ? p.employmentTypes.filter((x) => x !== k)
                    : [...p.employmentTypes, k],
                })
              }
              className={cn(
                "rounded-full border-2 border-ink px-3 py-1 text-sm font-bold",
                p.employmentTypes.includes(k) ? "bg-mint text-[#1e1b2e]" : "bg-card",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-muted-foreground">
        公開した投稿は、ログインした企業だけが見られます。検索エンジンにはのりません。
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="lg"
          variant="mint"
          disabled={pending || !p.title.trim() || !p.body.trim()}
          onClick={() => save(true)}
        >
          {published ? "保存する" : "公開する"}
        </Button>
        {!published && (
          <Button
            size="lg"
            variant="outline"
            disabled={pending || !p.title.trim() || !p.body.trim()}
            onClick={() => save(false)}
          >
            下書きとして保存
          </Button>
        )}
      </div>
    </div>
  );
}
