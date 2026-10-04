import { notFound } from "next/navigation";
import { env } from "@/lib/env";
import { getOptionalUser } from "@/server/auth/guards";
import { findValidInvitation } from "@/server/domain/invitation";
import { AcceptInvitation } from "./accept-invitation";

export const metadata = { title: "ご案内 | Axis" };

export default async function InvitePage(props: PageProps<"/invite/[token]">) {
  if (!env().ENABLE_AGENCY_PILOT) notFound();
  const { token } = await props.params;
  const invitation = await findValidInvitation(token);
  const user = await getOptionalUser();

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      {invitation ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{invitation.agencyName} からのご案内</p>
            <h1 className="text-2xl font-semibold">Axis へようこそ</h1>
          </div>
          <div className="space-y-3 text-sm leading-7">
            <p>
              Axis は、CA との面談の前に、あなた自身の考えや大切にしたいことを、AI
              との対話で整理するためのサービスです。
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>答えを決めるのはあなたです。Axis は転職すべきかどうかを判定しません。</li>
              <li>
                整理した内容を {invitation.agencyName}{" "}
                に共有するかどうか、どの項目を共有するかは、あなたが選べます。
              </li>
              <li>紹介会社との関係が終わっても、あなたの記録はあなたの手元に残ります。</li>
              <li>ご利用は無料です。</li>
            </ul>
          </div>
          <AcceptInvitation token={token} signedIn={user?.kind === "PERSON"} />
        </div>
      ) : (
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold">このご案内は使えません</h1>
          <p className="text-sm text-muted-foreground">
            ご案内の有効期限（14日）が切れているか、すでに登録済みです。登録済みの方は
            <a href="/login" className="underline">
              ログイン
            </a>
            してください。
          </p>
        </div>
      )}
    </main>
  );
}
