import { Container, PageTitle } from "@/components/board/page-title";
import { requireEmployer } from "@/server/auth/guards";
import { getEmployerProfile } from "@/server/domain/employer";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "会社・お店のプロフィール | Axis" };

export default async function EmployerProfilePage(props: PageProps<"/employer/profile">) {
  const sp = await props.searchParams;
  const user = await requireEmployer();
  const profile = await getEmployerProfile(user.userId);
  return (
    <Container narrow>
      <PageTitle
        lead={
          sp.welcome
            ? "ようこそ！まず、会社・お店のことを教えてください。求人に表示されます。"
            : "求人に表示される情報です。"
        }
      >
        会社・お店のプロフィール
      </PageTitle>
      <ProfileForm
        initial={{
          companyName: profile?.companyName ?? "",
          prefecture: profile?.prefecture ?? "",
          address: profile?.address ?? "",
          businessDescription: profile?.businessDescription ?? "",
          contactName: profile?.contactName ?? "",
          websiteUrl: profile?.websiteUrl ?? "",
          corporateNumber: profile?.corporateNumber ?? "",
        }}
        next={typeof sp.next === "string" ? sp.next : undefined}
      />
    </Container>
  );
}
