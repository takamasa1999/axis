import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MILESTONE_KIND_LABEL } from "@/lib/labels";
import { requirePerson } from "@/server/auth/guards";
import { listActiveRelationships } from "@/server/domain/consent";
import { getOwnedMilestone } from "@/server/domain/milestone";
import { getLatestReflection } from "@/server/domain/reflection";
import { NotFoundError } from "@/server/policy";
import { ReflectionEditor } from "./reflection-editor";

export const metadata = { title: "整理結果 | Axis" };

export default async function ReflectionPage(props: PageProps<"/axis/milestones/[id]/reflection">) {
  const { id } = await props.params;
  const actor = await requirePerson();
  const milestone = await getOwnedMilestone(actor, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const reflection = await getLatestReflection(actor, id);
  if (!reflection) notFound();
  const relationships = await listActiveRelationships(actor);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">
          整理結果：{milestone.title || MILESTONE_KIND_LABEL[milestone.kind]}
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          対話から作った下書きです。あなたの言葉と違うところは、自由に直してください（版{" "}
          {reflection.version.versionNo}）。
        </p>
      </div>

      <ReflectionEditor
        summaryId={reflection.summaryId}
        versionId={reflection.version.id}
        sections={reflection.version.sections.map((s) => ({
          aspect: s.aspect,
          content: s.content,
          isSensitive: s.isSensitive,
        }))}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">紹介会社への共有</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6">
          <p className="text-muted-foreground">
            共有するかどうか、どの項目を共有するかは、あなたが選べます。許可するまで何も共有されません。
          </p>
          {relationships.length === 0 && <p>共有できる紹介会社はありません。</p>}
          <ul className="space-y-2">
            {relationships.map((r) => (
              <li key={r.id}>
                <Link href={`/axis/milestones/${id}/share/${r.id}`} className="underline">
                  {r.agency.name} に共有する項目を選ぶ
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
