import { AgencyLoginForm } from "./login-form";

export const metadata = { title: "紹介会社の方のログイン | Axis" };

export default function AgencyLoginPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-16">
      <h1 className="text-2xl font-semibold">紹介会社の方のログイン</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        メールアドレス、パスワード、認証アプリのコードでログインします。
      </p>
      <AgencyLoginForm />
    </main>
  );
}
