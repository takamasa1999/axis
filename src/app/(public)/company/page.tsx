import Link from "next/link";
import { LegalPage } from "../legal-page";

export const metadata = { title: "運営者情報 | Axis" };

export default function CompanyPage() {
  return (
    <LegalPage title="運営者情報" updated="2026年10月（下書き）">
      <dl className="grid gap-3 sm:grid-cols-[200px_1fr]">
        <dt className="font-bold">サービス名</dt>
        <dd>Axis（求人・求職の掲示板）</dd>
        <dt className="font-bold">運営者</dt>
        <dd>（公開前に記載）</dd>
        <dt className="font-bold">所在地</dt>
        <dd>（公開前に記載）</dd>
        <dt className="font-bold">特定募集情報等提供事業の届出</dt>
        <dd>（届出の受理後に記載）</dd>
        <dt className="font-bold">電気通信事業の届出</dt>
        <dd>（届出の受理後に記載）</dd>
        <dt className="font-bold">苦情・相談の窓口</dt>
        <dd>
          <Link href="/contact" className="text-link underline">
            お問い合わせ・ご相談
          </Link>
          （受付から2営業日以内に対応を始めます）
        </dd>
      </dl>
      <p className="text-sm">
        本サービスは、職業安定法にもとづく募集情報等提供事業として運営しており、職業紹介（あっせん）は行っていません。求職者から料金を受け取ることはありません。
      </p>
    </LegalPage>
  );
}
