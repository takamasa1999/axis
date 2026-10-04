import { AuthShell } from "../auth-shell";
import { ResetForm } from "./reset-form";

export const metadata = { title: "新しいパスワード | Axis" };

export default async function ResetPasswordPage(props: PageProps<"/reset-password">) {
  const sp = await props.searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const invalid = sp.error === "INVALID_TOKEN" || !token;
  return (
    <AuthShell title="新しいパスワードを決める">
      {invalid ? (
        <p className="text-sm leading-7">
          リンクが無効か、有効期限が切れています。もう一度
          <a href="/forgot-password" className="text-link underline">
            再設定のリンク
          </a>
          を送ってください。
        </p>
      ) : (
        <ResetForm token={token} />
      )}
    </AuthShell>
  );
}
