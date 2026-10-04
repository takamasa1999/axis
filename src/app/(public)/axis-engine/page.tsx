import { History, MessagesSquare, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/board/page-title";
import { buttonVariants } from "@/components/ui/button";
import { getOptionalUser } from "@/server/auth/guards";
import { hasEntitlement } from "@/server/domain/entitlement";

export const metadata = { title: "Axis エンジン（追加機能）| Axis" };

export default async function AxisEnginePage() {
  const user = await getOptionalUser();
  const entitled = user?.kind === "PERSON" ? await hasEntitlement(user.userId) : false;
  return (
    <Container narrow>
      <div className="pop-card space-y-4 bg-lilac p-6 text-[#1e1b2e] sm:p-8">
        <p className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-card px-3 py-0.5 text-sm font-bold">
          <Sparkles className="size-4" aria-hidden /> 追加機能
        </p>
        <h1 className="text-3xl font-bold">Axis エンジン</h1>
        <p className="leading-8">
          AI
          との対話で、いまの気持ちや大切にしたいことを言葉にして整理し、節目ごとに残していける機能です。次の節目では、前の自分の判断から考え始められます。
        </p>
      </div>
      <ul className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          {
            Icon: MessagesSquare,
            title: "AI と対話して整理",
            body: "答えは決めません。問いと考える材料を返します。",
          },
          {
            Icon: History,
            title: "節目ごとに残る",
            body: "価値観や判断軸の変化を、あとから見返せます。",
          },
          {
            Icon: ShieldCheck,
            title: "共有はあなたが決める",
            body: "整理した内容を誰にも見せずに使えます。",
          },
        ].map(({ Icon, title, body }) => (
          <li key={title} className="pop-card p-5">
            <Icon className="size-6" aria-hidden />
            <p className="mt-2 font-bold">{title}</p>
            <p className="mt-1 text-sm leading-6">{body}</p>
          </li>
        ))}
      </ul>
      <div className="pop-card mt-6 space-y-3 p-5 text-sm leading-7">
        <p>
          <strong>
            掲示板の機能（求人をさがす・応募する・メッセージ・「探しています」の投稿）は、Axis
            エンジンを使わなくても、すべて無料で使えます。
          </strong>
        </p>
        <p>
          Axis
          エンジンは、いまは一部の方に先行して提供しています。提供の方法や料金は、決まりしだいお知らせします。
        </p>
        {entitled ? (
          <Link href="/axis" className={buttonVariants({ variant: "lilac" })}>
            Axis エンジンを使う
          </Link>
        ) : (
          <Link href="/contact" className={buttonVariants({ variant: "outline" })}>
            興味がある・使ってみたい
          </Link>
        )}
      </div>
    </Container>
  );
}
