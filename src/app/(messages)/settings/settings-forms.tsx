"use client";

import { Download, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/board/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { PASSWORD_MIN } from "@/lib/common-passwords";
import { deleteAccountAction, updateNotificationsAction } from "../actions";

export function SettingsForms({
  kind,
  notifyMessages: initialMessages,
  notifyJobAlerts: initialAlerts,
}: {
  kind: "PERSON" | "EMPLOYER";
  notifyMessages: boolean;
  notifyJobAlerts: boolean;
}) {
  const router = useRouter();
  const [notifyMessages, setNotifyMessages] = useState(initialMessages);
  const [notifyJobAlerts, setNotifyJobAlerts] = useState(initialAlerts);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();

  const saveNotifications = (m: boolean, a: boolean) =>
    startTransition(async () => {
      const r = await updateNotificationsAction({ notifyMessages: m, notifyJobAlerts: a });
      if (r.ok) toast.success("通知の設定を保存しました");
      else toast.error(r.error.message);
    });

  return (
    <div className="space-y-6">
      <section className="pop-card space-y-4 p-5">
        <h2 className="text-lg font-bold">メールでのお知らせ</h2>
        <label className="flex items-center gap-3">
          <Checkbox
            checked={notifyMessages}
            onCheckedChange={(v) => {
              setNotifyMessages(v === true);
              saveNotifications(v === true, notifyJobAlerts);
            }}
          />
          新しいメッセージが届いたとき
        </label>
        {kind === "PERSON" && (
          <label className="flex items-center gap-3">
            <Checkbox
              checked={notifyJobAlerts}
              onCheckedChange={(v) => {
                setNotifyJobAlerts(v === true);
                saveNotifications(notifyMessages, v === true);
              }}
            />
            保存した条件に合う新着求人があったとき
          </label>
        )}
      </section>

      <section className="pop-card space-y-4 p-5">
        <h2 className="text-lg font-bold">パスワードの変更</h2>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const { error } = await authClient.changePassword({
                currentPassword: current,
                newPassword: next,
                revokeOtherSessions: true,
              });
              if (error)
                toast.error(
                  error.message ?? "変更できませんでした。いまのパスワードを確認してください",
                );
              else {
                toast.success("パスワードを変更しました");
                setCurrent("");
                setNext("");
              }
            });
          }}
        >
          <FormField id="current" label="いまのパスワード">
            <Input
              id="current"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </FormField>
          <FormField id="next" label={`新しいパスワード（${PASSWORD_MIN}文字以上）`}>
            <Input
              id="next"
              type="password"
              autoComplete="new-password"
              minLength={PASSWORD_MIN}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
          </FormField>
          <Button type="submit" variant="outline" disabled={pending}>
            変更する
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          二段階認証（多要素認証）は、今後追加する予定です。
        </p>
      </section>

      {kind === "PERSON" && (
        <section className="pop-card space-y-3 p-5">
          <h2 className="text-lg font-bold">データの持ち出し</h2>
          <p className="text-sm">
            プロフィール・投稿・応募・メッセージ・Axis
            エンジンの記録を、ファイル（JSON）で受け取れます。
          </p>
          <a
            href="/api/me/export"
            className="inline-flex h-10 items-center gap-2 rounded-full border-2 border-ink bg-card px-4 text-sm font-bold shadow-pop-sm"
          >
            <Download className="size-4" aria-hidden /> ダウンロード
          </a>
        </section>
      )}

      <section className="pop-card space-y-3 p-5">
        <h2 className="text-lg font-bold">ログアウト</h2>
        <Button
          variant="outline"
          onClick={async () => {
            await authClient.signOut();
            router.push("/");
            router.refresh();
          }}
        >
          <LogOut /> ログアウト
        </Button>
      </section>

      <section className="pop-card space-y-3 p-5">
        <h2 className="text-lg font-bold">退会</h2>
        <p className="text-sm leading-7">
          退会すると、公開中の
          {kind === "EMPLOYER" ? "求人は掲載終了" : "「探しています」の投稿は非公開"}
          になり、メッセージの相手には「退会したユーザー」と表示されます。
          {kind === "PERSON" &&
            "Axis エンジンの記録も削除されます。必要なら先にデータを持ち出してください。"}
        </p>
        <Label htmlFor="confirm" className="font-normal">
          確認のため「退会する」と入力してください
        </Label>
        <Input id="confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        <Button
          variant="destructive"
          disabled={pending || confirmText !== "退会する"}
          onClick={() =>
            startTransition(async () => {
              const r = await deleteAccountAction({ confirm: "退会する" });
              if (r.ok) {
                toast.success("退会しました。ご利用ありがとうございました");
                router.push("/");
                router.refresh();
              } else toast.error(r.error.message);
            })
          }
        >
          退会する
        </Button>
      </section>
    </div>
  );
}
