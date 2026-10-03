import { requirePerson } from "@/server/auth/guards";

/** 本人向け画面。PERSON でログインしていなければ /login へ */
export default async function PersonLayout({ children }: { children: React.ReactNode }) {
  await requirePerson();
  return <div className="mx-auto w-full max-w-2xl px-4 py-6">{children}</div>;
}
