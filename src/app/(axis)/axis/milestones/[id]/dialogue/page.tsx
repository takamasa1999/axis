import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { MILESTONE_KIND_LABEL } from "@/lib/labels";
import { requirePerson } from "@/server/auth/guards";
import { getDialogueState } from "@/server/domain/dialogue";
import { NotFoundError } from "@/server/policy";
import { Chat } from "./chat";
import { StartDialogue } from "./start-dialogue";

export const metadata = { title: "対話 | Axis" };

export default async function DialoguePage(props: PageProps<"/axis/milestones/[id]/dialogue">) {
  const { id } = await props.params;
  const actor = await requirePerson();
  const state = await getDialogueState(actor, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const { milestone, session } = state;
  const title = milestone.title || MILESTONE_KIND_LABEL[milestone.kind];
  const messages = (session?.messages ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    kind: m.kind,
    content: m.content,
  }));

  if (!session || session.status === "NOT_STARTED") {
    return <StartDialogue milestoneId={milestone.id} title={title} />;
  }

  if (session.status === "COMPLETED") {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">{title}</h1>
        <Chat
          milestoneId={milestone.id}
          sessionId={session.id}
          initialMessages={messages}
          readOnly
        />
        <Link href={`/axis/milestones/${milestone.id}/reflection`} className={buttonVariants()}>
          整理結果を見る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      <Chat
        milestoneId={milestone.id}
        sessionId={session.id}
        initialMessages={messages}
        stopped={session.status === "SAFETY_STOPPED"}
      />
    </div>
  );
}
