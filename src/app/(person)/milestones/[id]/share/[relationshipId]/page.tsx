import { notFound } from "next/navigation";
import { requirePerson } from "@/server/auth/guards";
import { getShareCandidates } from "@/server/domain/consent";
import { NotFoundError } from "@/server/policy";
import { ShareForm } from "./share-form";

export const metadata = { title: "共有する項目を選ぶ | Axis" };

export default async function SharePage(
  props: PageProps<"/milestones/[id]/share/[relationshipId]">,
) {
  const { id, relationshipId } = await props.params;
  const actor = await requirePerson();
  const data = await getShareCandidates(actor, relationshipId, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{data.agencyName} に共有する項目を選ぶ</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          選んだ項目だけが、許可した時点の内容のまま担当の CA
          に届きます。対話の全文は共有されません。いつでも取り消せます。
        </p>
      </div>
      {data.activeConsent && (
        <p className="rounded-lg border bg-muted/40 p-3 text-sm leading-6">
          {data.activeConsent.grantedAt.toLocaleString("ja-JP")} に許可した内容（
          {data.activeConsent.items.length}
          項目）が共有されています。
          {data.activeConsent.sameVersion
            ? "新しく許可すると、この内容と置き換わります。"
            : "整理結果を修正した後の内容は、改めて許可するまで共有されません。"}
        </p>
      )}
      <ShareForm
        relationshipId={relationshipId}
        versionId={data.versionId}
        agencyName={data.agencyName}
        candidates={data.candidates}
      />
    </div>
  );
}
