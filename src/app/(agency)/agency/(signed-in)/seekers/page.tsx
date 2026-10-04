import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { requireAgencyStaff } from "@/server/auth/guards";
import {
  listPendingInvitations,
  listSeekers,
  SEEKER_STATUS_LABEL,
} from "@/server/domain/agency-seekers";

export const metadata = { title: "求職者 | Axis" };

export default async function SeekersPage() {
  const actor = await requireAgencyStaff();
  const [seekers, pending] = await Promise.all([listSeekers(actor), listPendingInvitations(actor)]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">求職者</h1>
        <p className="text-sm text-muted-foreground">
          本人が共有を許可した内容だけを確認できます。対話の内容や、許可されていない項目は表示されません。
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[480px] text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">求職者</th>
              <th className="px-3 py-2 font-medium">担当CA</th>
              <th className="px-3 py-2 font-medium">状態</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {seekers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                  まだ登録した求職者はいません
                </td>
              </tr>
            )}
            {seekers.map((s) => (
              <tr key={s.relationshipId} className="border-t">
                <td className="px-3 py-2">{s.email}</td>
                <td className="px-3 py-2">{s.assignedCaName ?? "未設定"}</td>
                <td className="px-3 py-2">
                  <Badge variant={s.status === "SHARED" ? "default" : "outline"}>
                    {SEEKER_STATUS_LABEL[s.status]}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/agency/seekers/${s.relationshipId}`} className="underline">
                    開く
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pending.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">案内済み（未登録）</h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {pending.map((p) => (
              <li key={p.id}>
                {p.email}（{p.createdAt.toLocaleDateString("ja-JP")} 送信・
                {p.expiresAt.toLocaleDateString("ja-JP")} まで有効）
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
