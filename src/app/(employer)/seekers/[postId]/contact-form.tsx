"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { contactSeekerAction } from "../../actions";

export function ContactForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await contactSeekerAction({ postId, body });
          if (r.ok) {
            toast.success("メッセージを送りました");
            router.push(`/messages/${r.data.conversationId}`);
          } else toast.error(r.error.message);
        });
      }}
    >
      <Textarea
        aria-label="メッセージ"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        rows={5}
        placeholder="例：はじめまして、ひだまりカフェの田中です。平日の昼に働ける方を探していて、投稿を拝見しました。"
      />
      <Button type="submit" disabled={pending || !body.trim()}>
        {pending ? "送信しています…" : "メッセージを送る"}
      </Button>
    </form>
  );
}
