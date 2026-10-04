import { notFound } from "next/navigation";
import { requireMember } from "@/server/auth/guards";
import { getConversationView, markRead } from "@/server/domain/conversation";
import { NotFoundError } from "@/server/policy";
import { ConversationView } from "./conversation-view";

export const metadata = { title: "メッセージ | Axis" };

export default async function ConversationPage(props: PageProps<"/messages/[conversationId]">) {
  const { conversationId } = await props.params;
  const user = await requireMember(`/messages/${conversationId}`);
  const view = await getConversationView(user, conversationId).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  await markRead(user, conversationId);
  return (
    <ConversationView
      conversationId={conversationId}
      me={user.kind === "EMPLOYER" ? "EMPLOYER" : "PERSON"}
      emailVerified={user.emailVerified}
      counterpart={view.counterpart}
      blockedByMe={view.blockedByMe}
      initialMessages={view.messages}
      applications={view.applications.map((a) => ({
        id: a.id,
        jobPostId: a.jobPostId,
        jobTitle: a.jobTitle,
        sharedProfile: a.sharedProfile,
        createdAt: a.createdAt.toISOString(),
      }))}
    />
  );
}
