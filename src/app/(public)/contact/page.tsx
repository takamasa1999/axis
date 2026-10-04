import { Container, PageTitle } from "@/components/board/page-title";
import { getOptionalUser } from "@/server/auth/guards";
import { ContactForm } from "./contact-form";

export const metadata = { title: "お問い合わせ・ご相談 | Axis" };

export default async function ContactPage() {
  const user = await getOptionalUser();
  return (
    <Container narrow>
      <PageTitle lead="使い方の質問、困ったこと、求人やメッセージについての苦情・相談を受け付けています。2営業日以内に対応を始めます。">
        お問い合わせ・ご相談
      </PageTitle>
      <ContactForm defaultEmail={user?.email ?? ""} />
      <p className="mt-6 text-sm text-muted-foreground">
        求人・投稿・メッセージの内容についてのご相談は、それぞれの画面の「運営に知らせる」「通報」からもお送りいただけます。
      </p>
    </Container>
  );
}
