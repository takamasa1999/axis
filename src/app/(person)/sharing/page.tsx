import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePerson } from "@/server/auth/guards";
import { getSharingOverview } from "@/server/domain/consent";
import { EndRelationshipButton, RevokeButton } from "./sharing-buttons";

export const metadata = { title: "共有の管理 | Axis" };

const EVENT_LABEL: Record<string, string> = {
  INVITATION_ACCEPTED: "ご案内を受けて登録しました",
  CONSENT_GRANTED: "共有を許可しました",
  CONSENT_REVOKED: "共有を取り消しました",
  CONSENT_SUPERSEDED: "以前の共有を新しい内容に置き換えました",
  SNAPSHOT_VIEWED: "担当者が共有内容を閲覧しました",
  SNAPSHOT_EXPORTED: "担当者が共有内容をファイルに出力しました",
  RELATIONSHIP_ENDED: "関係を終了しました",
};

export default async function SharingPage() {
  const actor = await requirePerson();
  const { relationships, events } = await getSharingOverview(actor);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">共有の管理</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          紹介会社ごとに、いま共有している内容を確認・取り消しできます。関係を終了しても、あなたの記録は残ります。
        </p>
      </div>

      {relationships.length === 0 && <p className="text-sm">紹介会社とのつながりはありません。</p>}

      {relationships.map((r) => {
        const consent = r.consents[0];
        return (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                {r.agency.name}
                <Badge variant={r.status === "ACTIVE" ? "secondary" : "outline"}>
                  {r.status === "ACTIVE" ? "利用中" : "終了"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {r.status === "ACTIVE" && consent?.snapshot ? (
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    {consent.grantedAt.toLocaleString("ja-JP")} に許可した内容（整理結果の版{" "}
                    {consent.reflectionVersion.versionNo}）を共有しています。
                  </p>
                  <ul className="space-y-2">
                    {consent.snapshot.items.map((item) => (
                      <li key={item.id} className="rounded-md border p-3">
                        <p className="font-medium">{item.label}</p>
                        <p className="mt-1 whitespace-pre-wrap leading-6 text-muted-foreground">
                          {item.content}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <RevokeButton consentId={consent.id} />
                </div>
              ) : (
                <p className="text-muted-foreground">
                  {r.status === "ACTIVE"
                    ? "いまは何も共有していません。"
                    : "この紹介会社との関係は終了しています。"}
                </p>
              )}
              {r.status === "ACTIVE" && (
                <EndRelationshipButton relationshipId={r.id} agencyName={r.agency.name} />
              )}
            </CardContent>
          </Card>
        );
      })}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">操作の履歴</h2>
        {events.length === 0 && (
          <p className="text-sm text-muted-foreground">まだ履歴はありません。</p>
        )}
        <ul className="space-y-1 text-sm">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap gap-x-3">
              <span className="text-muted-foreground">{e.occurredAt.toLocaleString("ja-JP")}</span>
              <span>
                {e.agency?.name ? `${e.agency.name}：` : ""}
                {EVENT_LABEL[e.type] ?? e.type}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
