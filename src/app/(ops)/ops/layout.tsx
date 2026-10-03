import { requireOperator } from "@/server/auth/guards";

/** 運営向け画面。運営（isOperator）でなければ /agency/login へ */
export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  await requireOperator();
  return <div className="mx-auto w-full max-w-5xl px-4 py-6">{children}</div>;
}
