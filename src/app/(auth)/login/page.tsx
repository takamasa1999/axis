import Link from "next/link";
import { AuthShell } from "../auth-shell";
import { LoginForm } from "./login-form";

export const metadata = { title: "ログイン | Axis" };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return (
    <AuthShell
      title="ログイン"
      lead={
        <>
          はじめての方は{" "}
          <Link
            href={(next ? `/signup?next=${encodeURIComponent(next)}` : "/signup") as "/signup"}
            className="text-link underline"
          >
            無料で登録
          </Link>
        </>
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
