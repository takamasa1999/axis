import Link from "next/link";
import { AuthShell } from "../auth-shell";
import { SignUpForm } from "./signup-form";

export const metadata = { title: "はじめる（無料）| Axis" };

export default async function SignUpPage(props: PageProps<"/signup">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const kind = sp.as === "employer" ? "EMPLOYER" : sp.as === "seeker" ? "PERSON" : undefined;
  return (
    <AuthShell
      title="Axis をはじめる"
      lead={
        <>
          登録は無料、メールアドレスとパスワードだけ。すでに登録済みの方は{" "}
          <Link
            href={(next ? `/login?next=${encodeURIComponent(next)}` : "/login") as "/login"}
            className="text-link underline"
          >
            ログイン
          </Link>
        </>
      }
    >
      <SignUpForm next={next} initialKind={kind} />
    </AuthShell>
  );
}
