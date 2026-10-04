"use client";

import { useState, useTransition } from "react";
import { FormField, Select } from "@/components/board/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sendInquiryAction } from "./actions";

export function ContactForm({ defaultEmail }: { defaultEmail: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [category, setCategory] = useState<"COMPLAINT" | "QUESTION" | "OTHER">("QUESTION");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <p className="pop-card p-5 leading-7">
        お問い合わせを受け付けました。内容を確認し、2営業日以内に対応を始めます。返信が必要な場合は、入力いただいたメールアドレスにご連絡します。
      </p>
    );
  }
  return (
    <form
      className="pop-card space-y-5 p-5 sm:p-7"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const r = await sendInquiryAction({ email, category, body });
          if (r.ok) setDone(true);
          else setError(Object.values(r.error.fieldErrors ?? {})[0]?.[0] ?? r.error.message);
        });
      }}
    >
      <FormField id="email" label="メールアドレス" required>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>
      <FormField id="category" label="種類" required>
        <Select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
        >
          <option value="QUESTION">質問</option>
          <option value="COMPLAINT">苦情・困りごと</option>
          <option value="OTHER">その他</option>
        </Select>
      </FormField>
      <FormField id="body" label="内容" required>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={5000}
          rows={6}
        />
      </FormField>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "送信しています…" : "送信する"}
      </Button>
      {error && (
        <p role="alert" className="text-sm font-bold text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
