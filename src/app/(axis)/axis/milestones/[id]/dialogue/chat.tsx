"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { completeDialogueAction } from "../../../actions";

type Message = {
  id: string;
  role: "PERSON" | "AXIS";
  kind: "ANSWER" | "QUESTION" | "MATERIAL" | "SAFETY" | "INTRO";
  content: string;
};

type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "reset" }
  | {
      type: "done";
      kind: "QUESTION" | "MATERIAL" | "SAFETY";
      text: string;
      readyToSummarize: boolean;
    }
  | { type: "error"; message: string };

/** 4回答えたら、AI の判断を待たずに「整理結果を作る」を出す */
const MIN_ANSWERS_TO_SUMMARIZE = 4;

export function Chat({
  milestoneId,
  sessionId,
  initialMessages,
  readOnly = false,
  stopped: initiallyStopped = false,
}: {
  milestoneId: string;
  sessionId: string;
  initialMessages: Message[];
  readOnly?: boolean;
  stopped?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const [stopped, setStopped] = useState(initiallyStopped);
  const [error, setError] = useState<string | null>(null);
  const [completing, startCompleting] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  const answers = messages.filter((m) => m.role === "PERSON").length;
  const canSummarize = !stopped && (ready || answers >= MIN_ANSWERS_TO_SUMMARIZE);

  // 新しいメッセージ・ストリーミング中の文字が増えたら、いちばん下まで送る
  useEffect(() => {
    if (messages.length > 0)
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send() {
    const content = input.trim();
    if (!content || sending) return;
    setError(null);
    setSending(true);
    setInput("");
    const pendingId = `axis-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: `me-${Date.now()}`, role: "PERSON", kind: "ANSWER", content },
      { id: pendingId, role: "AXIS", kind: "QUESTION", content: "" },
    ]);
    const update = (fn: (m: Message) => Message) =>
      setMessages((prev) => prev.map((m) => (m.id === pendingId ? fn(m) : m)));

    try {
      const response = await fetch(`/api/dialogue/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok || !response.body) {
        throw new Error(
          response.status === 429
            ? "少し時間をおいてから、もう一度送ってください"
            : "送信できませんでした。もう一度お試しください",
        );
      }
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;
          if (event.type === "delta") update((m) => ({ ...m, content: m.content + event.text }));
          if (event.type === "reset") update((m) => ({ ...m, content: "" }));
          if (event.type === "done") {
            update((m) => ({ ...m, kind: event.kind, content: event.text }));
            setReady(event.readyToSummarize);
            if (event.kind === "SAFETY") setStopped(true);
          }
          if (event.type === "error") throw new Error(event.message);
        }
      }
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== pendingId));
      setError(e instanceof Error ? e.message : "送信できませんでした");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <ol className="space-y-3" aria-live="polite">
        {messages.map((m) => (
          <li
            key={m.id}
            className={cn("flex", m.role === "PERSON" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-7",
                m.role === "PERSON" && "bg-primary text-primary-foreground",
                m.role === "AXIS" && m.kind === "MATERIAL" && "border border-dashed bg-muted/40",
                m.role === "AXIS" && m.kind !== "MATERIAL" && m.kind !== "SAFETY" && "bg-muted",
                m.kind === "SAFETY" && "border border-amber-300 bg-amber-50 text-amber-950",
              )}
            >
              {m.role === "AXIS" && m.kind === "MATERIAL" && (
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  考える材料
                </span>
              )}
              {m.content || (
                <span className="animate-pulse text-muted-foreground">考えています…</span>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div ref={bottomRef} />

      {!readOnly && !stopped && (
        <div className="space-y-2">
          <Textarea
            aria-label="あなたのことば"
            placeholder="思ったことを、そのまま書いてください"
            rows={3}
            maxLength={4000}
            value={input}
            disabled={sending || completing}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void send()} disabled={sending || completing || !input.trim()}>
              {sending ? "送信中…" : "送る"}
            </Button>
            <span className="text-xs text-muted-foreground">⌘/Ctrl + Enter でも送れます</span>
          </div>
        </div>
      )}

      {!readOnly && canSummarize && (
        <div className="rounded-lg border p-4 text-sm">
          <p className="mb-3 leading-6">
            話し終えたら、ここまでの内容から整理結果を作ります。作ったあとで、あなたが確認・修正できます。
          </p>
          <Button
            variant={ready ? "default" : "outline"}
            disabled={completing || sending}
            onClick={() =>
              startCompleting(async () => {
                const result = await completeDialogueAction({ sessionId, milestoneId });
                if (result && !result.ok) setError(result.error.message);
              })
            }
          >
            {completing ? "整理しています…（30秒ほどかかります）" : "整理結果を作る"}
          </Button>
        </div>
      )}

      {stopped && (
        <p className="text-sm text-muted-foreground">
          対話はいったん止まっています。落ち着いたら、ホームからいつでも新しい節目を始められます。
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
