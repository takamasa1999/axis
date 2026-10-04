import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAgencyStaff } from "@/server/auth/guards";
import { SEEKER_STATUS_LABEL } from "@/server/domain/agency-seekers";
import { getSnapshotForAgency } from "@/server/domain/snapshot";
import { NotFoundError } from "@/server/policy";
import { CopyButton } from "./copy-button";

export const metadata = { title: "共有された内容 | Axis" };

const STATUS_NOTE: Partial<Record<string, string>> = {
  REGISTERED: "本人はまだ対話を始めていません。",
  IN_DIALOGUE: "本人が対話中です。",
  INCOMPLETE: "対話が完了していません。",
  AWAITING_CONSENT: "本人の共有の許可を待っています。",
  REVOKED: "本人が共有を取り消しました。",
  ENDED: "本人との関係は終了しています。",
};

export default async function SeekerDetailPage(
  props: PageProps<"/agency/seekers/[relationshipId]">,
) {
  const { relationshipId } = await props.params;
  const actor = await requireAgencyStaff();
  const { seeker, snapshot } = await getSnapshotForAgency(actor, relationshipId).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });

  const plainText = snapshot?.items.map((i) => `■ ${i.label}\n${i.content}`).join("\n\n") ?? "";

  return (
    <div className="space-y-6">
      <Link href="/agency/seekers" className="text-sm underline">
        ← 求職者の一覧
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{seeker.email}</h1>
        <Badge variant={seeker.status === "SHARED" ? "default" : "outline"}>
          {SEEKER_STATUS_LABEL[seeker.status]}
        </Badge>
      </div>

      {snapshot ? (
        <>
          <p className="text-sm text-muted-foreground">
            {snapshot.consent.grantedAt.toLocaleString("ja-JP")} に本人が共有を許可した内容です（
            {snapshot.items.length} 項目）。
          </p>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={plainText} />
            <a
              href={`/api/agency/relationships/${relationshipId}/snapshot.csv`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              CSV をダウンロード
            </a>
          </div>
          <div className="space-y-4">
            {snapshot.items.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-base">{item.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-7">{item.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <p className="rounded-lg border bg-muted/40 p-4 text-sm">
          {STATUS_NOTE[seeker.status] ?? "共有された内容はありません。"}
        </p>
      )}
    </div>
  );
}
