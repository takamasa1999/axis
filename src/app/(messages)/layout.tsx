import { requireMember } from "@/server/auth/guards";

/** 会話・設定の画面（求職者と企業） */
export default async function MessagesLayout({ children }: LayoutProps<"/">) {
  await requireMember("/messages");
  return children;
}
