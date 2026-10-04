import { AuthShell } from "../auth-shell";
import { ForgotForm } from "./forgot-form";

export const metadata = { title: "パスワードの再設定 | Axis" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="パスワードの再設定"
      lead="登録したメールアドレスに、再設定用のリンクを送ります。"
    >
      <ForgotForm />
    </AuthShell>
  );
}
