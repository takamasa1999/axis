import { requireEmployer } from "@/server/auth/guards";

/** 企業向けの画面（/employer, /seekers）。企業でなければ振り分ける */
export default async function EmployerLayout({ children }: LayoutProps<"/">) {
  await requireEmployer();
  return children;
}
