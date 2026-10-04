import { LoginForm } from "./login-form";

export const metadata = { title: "ログイン | Axis" };

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-16">
      <h1 className="text-2xl font-semibold">ログイン</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        登録したメールアドレスに、ログイン用のリンクを送ります。
      </p>
      <LoginForm />
    </main>
  );
}
