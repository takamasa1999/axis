"use client";

import { ArrowLeft, Ban, Flag, Info, Send, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Select } from "@/components/board/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { categoryLabel, relativeTime } from "@/lib/format";
import { REPORT_REASONS, SHAREABLE_PROFILE_FIELDS } from "@/lib/master-data";
import { cn } from "@/lib/utils";
import {
  blockAction,
  markReadAction,
  reportAction,
  sendMessageAction,
  unblockAction,
} from "../../actions";

type Msg = {
  id: string;
  kind: "USER" | "SYSTEM";
  sender: "me" | "them" | "system";
  body: string;
  createdAt: string;
};
type Application = {
  id: string;
  jobPostId: string;
  jobTitle: string;
  sharedProfile: Record<string, unknown>;
  createdAt: string;
};

const POLL_MS = 3000;
const POLL_HIDDEN_MS = 30000;

/**
 * 会話の画面（T049 / FR-024〜FR-030）。3秒ごとに差分を取りにいく（非表示のときは30秒）。
 * 運営はこの会話を読めない。通報のときは、選んだメッセージだけが運営に届く。
 */
export function ConversationView({
  conversationId,
  me,
  emailVerified,
  counterpart,
  blockedByMe: initiallyBlocked,
  initialMessages,
  applications,
}: {
  conversationId: string;
  me: "PERSON" | "EMPLOYER";
  emailVerified: boolean;
  counterpart: { id: string; name: string; role: "PERSON" | "EMPLOYER" };
  blockedByMe: boolean;
  initialMessages: Msg[];
  applications: Application[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, startSending] = useTransition();
  const [blocked, setBlocked] = useState(initiallyBlocked);
  const [reporting, setReporting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState<keyof typeof REPORT_REASONS>("HARASSMENT");
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(initialMessages.at(-1)?.id);

  const poll = useCallback(async () => {
    const after = lastIdRef.current ? `?after=${lastIdRef.current}` : "";
    const res = await fetch(`/api/conversations/${conversationId}/messages${after}`, {
      cache: "no-store",
    }).catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as { messages: Msg[] };
    if (data.messages.length > 0) {
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...prev, ...data.messages.filter((m) => !seen.has(m.id))];
      });
      lastIdRef.current = data.messages.at(-1)?.id;
      if (data.messages.some((m) => m.sender === "them")) void markReadAction({ conversationId });
    }
  }, [conversationId]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      await poll();
      timer = setTimeout(loop, document.hidden ? POLL_HIDDEN_MS : POLL_MS);
    };
    timer = setTimeout(loop, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        void loop();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll]);

  useEffect(() => {
    if (messages.length > 0)
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function send() {
    const text = body.trim();
    if (!text) return;
    startSending(async () => {
      const result = await sendMessageAction({ conversationId, body: text });
      if (result.ok) {
        setBody("");
        await poll();
      } else toast.error(result.error.message);
    });
  }

  function submitReport() {
    startSending(async () => {
      const result = await reportAction({
        targetType: "MESSAGE",
        targetId: conversationId,
        reason,
        messageIds: selected,
      });
      if (result.ok) {
        toast.success("受け付けました。選んだメッセージだけを運営が確認します");
        setReporting(false);
        setSelected([]);
      } else toast.error(result.error.message);
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Link href="/messages" className="inline-flex items-center gap-1 text-sm font-bold">
          <ArrowLeft className="size-4" /> メッセージ
        </Link>
        <div className="flex gap-1">
          <Button variant="ghost" size="xs" onClick={() => setReporting((v) => !v)}>
            <Flag /> 通報
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() =>
              startSending(async () => {
                if (blocked) {
                  const r = await unblockAction({ conversationId });
                  if (r.ok) setBlocked(false);
                } else if (
                  window.confirm(
                    `${counterpart.name} さんをブロックしますか？相手はあなたにメッセージを送れなくなります。`,
                  )
                ) {
                  const r = await blockAction({ conversationId });
                  if (r.ok) setBlocked(true);
                }
              })
            }
          >
            <Ban /> {blocked ? "ブロックを解除" : "ブロック"}
          </Button>
        </div>
      </div>

      <h1 className="text-xl font-bold">{counterpart.name}</h1>

      {/* 企業には、応募で共有された内容だけを表示する（FR-023） */}
      {me === "EMPLOYER" && applications.length > 0 && (
        <details className="pop-card mt-3 p-4 text-sm">
          <summary className="cursor-pointer font-bold">
            応募で共有されたプロフィール（{applications.length}件）
          </summary>
          {applications.map((a) => (
            <div key={a.id} className="mt-3 border-t-2 border-dashed border-ink/20 pt-3">
              <p className="font-bold">
                <Link href={`/jobs/${a.jobPostId}`} className="underline">
                  {a.jobTitle}
                </Link>
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {relativeTime(a.createdAt)}に応募
                </span>
              </p>
              <dl className="mt-1 space-y-1">
                {Object.entries(SHAREABLE_PROFILE_FIELDS).map(([k, label]) => {
                  const v = a.sharedProfile[k];
                  if (v === undefined || v === null || (Array.isArray(v) && v.length === 0))
                    return null;
                  const text = Array.isArray(v)
                    ? (k === "desiredCategories" ? v.map(String).map(categoryLabel) : v).join("・")
                    : String(v);
                  return (
                    <div key={k}>
                      <dt className="inline font-bold">{label}：</dt>
                      <dd className="inline whitespace-pre-wrap">{text}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ))}
        </details>
      )}

      <p className="mt-3 flex items-start gap-2 rounded-xl border-2 border-dashed border-ink p-3 text-xs leading-5">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          外部の連絡先（LINE・電話など）に移る前に、相手が信頼できるか確かめましょう。お金を求められたり、不安を感じたりしたら「通報」から運営に知らせてください。
          このメッセージは、運営も読めません。
        </span>
      </p>

      {reporting && (
        <div className="pop-card mt-3 space-y-3 bg-sun-soft p-4 text-sm">
          <p className="font-bold">
            通報するメッセージを選んでください。選んだメッセージだけが運営に届きます。
          </p>
          <Select
            value={reason}
            onChange={(e) => setReason(e.target.value as keyof typeof REPORT_REASONS)}
          >
            {Object.entries(REPORT_REASONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Button size="sm" disabled={sending || selected.length === 0} onClick={submitReport}>
              {selected.length}件を運営に送る
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setReporting(false)}>
              やめる
            </Button>
          </div>
        </div>
      )}

      <ol className="mt-4 space-y-3" aria-live="polite">
        {messages.map((m) =>
          m.kind === "SYSTEM" ? (
            <li key={m.id} className="flex justify-center">
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-subtle px-3 py-1 text-xs font-bold">
                <Info className="size-3.5" aria-hidden />
                {m.body}
              </span>
            </li>
          ) : (
            <li
              key={m.id}
              className={cn(
                "flex items-end gap-2",
                m.sender === "me" ? "justify-end" : "justify-start",
              )}
            >
              {reporting && (
                <Checkbox
                  aria-label="このメッセージを通報に含める"
                  checked={selected.includes(m.id)}
                  onCheckedChange={(on) =>
                    setSelected((p) => (on ? [...p, m.id] : p.filter((x) => x !== m.id)))
                  }
                />
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl border-2 border-ink px-4 py-2.5 text-[15px] leading-7 whitespace-pre-wrap shadow-pop-sm",
                  m.sender === "me"
                    ? "rounded-br-sm bg-sun text-[#1e1b2e]"
                    : "rounded-bl-sm bg-card",
                )}
              >
                {m.body}
                <span className="mt-0.5 block text-right text-[10px] opacity-70">
                  {relativeTime(m.createdAt)}
                </span>
              </div>
            </li>
          ),
        )}
      </ol>
      <div ref={bottomRef} />

      <div className="sticky bottom-16 mt-4 bg-paper pt-2 pb-3 md:bottom-0">
        {!emailVerified ? (
          <p className="rounded-xl border-2 border-ink bg-sun-soft p-3 text-sm">
            メールアドレスの確認が終わると、メッセージを送れます。
          </p>
        ) : blocked ? (
          <p className="rounded-xl border-2 border-ink bg-subtle p-3 text-sm">
            この相手をブロックしています。
          </p>
        ) : (
          <div className="flex items-end gap-2">
            <Textarea
              aria-label="メッセージ"
              placeholder="メッセージを書く"
              value={body}
              rows={2}
              maxLength={2000}
              className="min-h-14"
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button size="icon" aria-label="送信" disabled={sending || !body.trim()} onClick={send}>
              <Send />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
