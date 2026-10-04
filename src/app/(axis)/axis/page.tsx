import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MILESTONE_KIND_LABEL } from "@/lib/labels";
import { requirePerson } from "@/server/auth/guards";
import { listMilestones } from "@/server/domain/milestone";
import { NewMilestoneForm } from "./new-milestone-form";

export const metadata = { title: "ホーム | Axis" };

const SESSION_LABEL: Record<string, string> = {
  NOT_STARTED: "未開始",
  IN_PROGRESS: "対話中",
  PAUSED: "中断中",
  COMPLETED: "整理済み",
  SAFETY_STOPPED: "お休み中",
};

export default async function HomePage() {
  const actor = await requirePerson();
  const milestones = await listMilestones(actor);

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">あなたの Axis</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          節目ごとに、そのときの気持ちや大切にしたいことを残していく場所です。
        </p>
      </section>

      <NewMilestoneForm />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">これまでの節目</h2>
        {milestones.length === 0 && (
          <p className="text-sm text-muted-foreground">
            まだ節目がありません。上から始めてみましょう。
          </p>
        )}
        {milestones.map((m) => {
          const session = m.sessions[0];
          const completed = session?.status === "COMPLETED";
          return (
            <Card key={m.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {m.title || MILESTONE_KIND_LABEL[m.kind]}
                  <Badge variant="secondary">{MILESTONE_KIND_LABEL[m.kind]}</Badge>
                  {session && <Badge variant="outline">{SESSION_LABEL[session.status]}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  {m.startedAt.toLocaleDateString("ja-JP")} に開始
                </span>
                <Link href={`/axis/milestones/${m.id}/dialogue`} className="underline">
                  {completed ? "対話を見る" : "対話を続ける"}
                </Link>
                {completed && (
                  <Link href={`/axis/milestones/${m.id}/reflection`} className="underline">
                    整理結果を見る
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
