import { requireSeeker } from "@/server/auth/guards";

/** 求職者向けの画面（/me, /jobs/[id]/apply）。求職者でなければ振り分ける */
export default async function SeekerLayout({ children }: LayoutProps<"/">) {
  await requireSeeker();
  return children;
}
