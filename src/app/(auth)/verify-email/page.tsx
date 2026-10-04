import { AuthShell } from "../auth-shell";
import { ResendForm } from "./resend-form";

export const metadata = { title: "メールアドレスの確認 | Axis" };

export default async function VerifyEmailPage(props: PageProps<"/verify-email">) {
  const sp = await props.searchParams;
  const email = typeof sp.email === "string" ? sp.email : "";
  return (
    <AuthShell
      title="メールアドレスの確認"
      lead="登録したメールアドレスに届いたリンクを開くと、登録が完了します。届かないときは、送り直せます。"
    >
      <ResendForm initialEmail={email} />
    </AuthShell>
  );
}
