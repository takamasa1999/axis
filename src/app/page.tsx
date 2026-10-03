import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-4 py-16">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Axis</h1>
        <p className="text-muted-foreground leading-7">
          節目のたびに、過去の自分の判断から考え始められる場所。
          <br />
          答えを決めるのはあなたです。整理した内容を誰に見せるかも、あなたが選びます。
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/login" className={buttonVariants()}>
          ログイン
        </Link>
        <Link href="/agency/login" className={buttonVariants({ variant: "outline" })}>
          紹介会社の方はこちら
        </Link>
      </div>
    </main>
  );
}
