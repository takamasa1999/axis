import { formatDate } from "@/lib/format";
import { requireOperator } from "@/server/auth/guards";
import { listEntitlements } from "@/server/domain/entitlement";
import { EndButton, GrantForm } from "./entitlement-forms";

export const metadata = { title: "追加機能の利用権 | Axis 運営" };

export default async function EntitlementsPage() {
  const op = await requireOperator();
  const list = await listEntitlements(op);
  const now = Date.now();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">追加機能（Axis エンジン）の利用権</h1>
      <p className="text-sm text-muted-foreground">
        料金の受け取り方は未決のため、当面は運営が手動で付与します。求職者からの料金の受け取りは、法務確認が済むまで行いません。
      </p>
      <GrantForm />
      <ul className="space-y-2">
        {list.map((e) => {
          const active = e.startsAt.getTime() <= now && (!e.endsAt || e.endsAt.getTime() > now);
          return (
            <li
              key={e.id}
              className="pop-card flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
            >
              <span>
                <strong>{e.user.seekerProfile?.displayName ?? "-"}</strong>（{e.user.email}）・
                {formatDate(e.startsAt)}〜{e.endsAt ? formatDate(e.endsAt) : "期限なし"}・
                {active ? "有効" : "終了"}
              </span>
              {active && <EndButton entitlementId={e.id} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
