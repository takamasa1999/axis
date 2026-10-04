"use client";

import { Eye } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { categoryLabel } from "@/lib/format";
import { SHAREABLE_PROFILE_FIELDS, type ShareableProfileField } from "@/lib/master-data";
import { applyAction, askQuestionAction } from "../../../actions";

type Profile = {
  displayName: string;
  desiredCategories: string[];
  desiredPrefectures: string[];
  experience: string | null;
  qualifications: string | null;
  selfIntroduction: string | null;
};

function show(field: ShareableProfileField, p: Profile): string {
  const v = p[field];
  if (Array.isArray(v))
    return field === "desiredCategories" ? v.map(categoryLabel).join("・") : v.join("・");
  return v ?? "";
}

/** 応募：共有する項目を選ぶ → 企業に見える内容を確認 → 送る（FR-022）。質問：本文だけ */
export function ApplyForm({
  jobId,
  company,
  mode,
  profile,
}: {
  jobId: string;
  company: string;
  mode: "apply" | "question";
  profile: Profile;
}) {
  const router = useRouter();
  const fields = Object.keys(SHAREABLE_PROFILE_FIELDS) as ShareableProfileField[];
  const available = fields.filter((f) => show(f, profile));
  const [shared, setShared] = useState<ShareableProfileField[]>(available);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result =
        mode === "question"
          ? await askQuestionAction({ jobId, body: message })
          : await applyAction({ jobId, sharedFields: shared, firstMessage: message || undefined });
      if (result.ok) {
        toast.success(mode === "question" ? "質問を送りました" : "応募しました！");
        router.push(`/messages/${result.data.conversationId}`);
      } else toast.error(result.error.message);
    });
  }

  return (
    <div className="space-y-5">
      {mode === "apply" && (
        <section className="pop-card space-y-4 p-5">
          <h2 className="text-lg font-bold">企業に見せるプロフィール</h2>
          <p className="text-sm text-muted-foreground">
            チェックした項目だけが、応募した時点の内容のまま {company}{" "}
            に届きます。表示名はいつも表示されます。
          </p>
          {available.length === 0 ? (
            <p className="text-sm">
              まだプロフィールの項目がありません。
              <Link
                href={`/me/profile?next=${encodeURIComponent(`/jobs/${jobId}/apply`)}`}
                className="text-link underline"
              >
                プロフィールを書く
              </Link>
              と、自分のことを伝えやすくなります（書かなくても応募できます）。
            </p>
          ) : (
            <ul className="space-y-2">
              {available.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-3 rounded-xl border-2 border-ink bg-card p-3"
                >
                  <Checkbox
                    id={`share-${f}`}
                    checked={shared.includes(f)}
                    onCheckedChange={(on) =>
                      setShared((p) => (on ? [...p, f] : p.filter((x) => x !== f)))
                    }
                  />
                  <Label htmlFor={`share-${f}`} className="block font-normal">
                    <span className="font-bold">{SHAREABLE_PROFILE_FIELDS[f]}</span>
                    <span className="block text-sm whitespace-pre-wrap text-muted-foreground">
                      {show(f, profile)}
                    </span>
                  </Label>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="pop-card space-y-3 p-5">
        <Label htmlFor="message" className="text-lg font-bold">
          {mode === "question" ? "質問" : "ひとことメッセージ（任意）"}
        </Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder={
            mode === "question"
              ? "例：見学はできますか？"
              : "例：はじめまして。平日の昼に働けるところをさがしています。"
          }
        />
      </section>

      {mode === "apply" && (
        <section className="rounded-2xl border-2 border-dashed border-ink p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <Eye className="size-5" aria-hidden /> {company} に見える内容
          </h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div>
              <dt className="inline font-bold">表示名：</dt>
              <dd className="inline">{profile.displayName}</dd>
            </div>
            {shared.map((f) => (
              <div key={f}>
                <dt className="inline font-bold">{SHAREABLE_PROFILE_FIELDS[f]}：</dt>
                <dd className="inline whitespace-pre-wrap">{show(f, profile)}</dd>
              </div>
            ))}
            {message && (
              <div>
                <dt className="inline font-bold">メッセージ：</dt>
                <dd className="inline whitespace-pre-wrap">{message}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <Button
        size="lg"
        className="w-full"
        disabled={pending || (mode === "question" && !message.trim())}
        onClick={submit}
      >
        {pending ? "送信しています…" : mode === "question" ? "質問を送る" : "この内容で応募する"}
      </Button>
    </div>
  );
}
