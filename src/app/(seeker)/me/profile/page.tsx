import { Container, PageTitle } from "@/components/board/page-title";
import { requireSeeker } from "@/server/auth/guards";
import { getSeekerProfile } from "@/server/domain/seeker";
import { SeekerProfileForm } from "./seeker-profile-form";

export const metadata = { title: "プロフィール | Axis" };

export default async function SeekerProfilePage(props: PageProps<"/me/profile">) {
  const sp = await props.searchParams;
  const user = await requireSeeker();
  const profile = await getSeekerProfile(user.userId);
  return (
    <Container narrow>
      <PageTitle
        lead={
          sp.welcome
            ? "ようこそ！まずは表示名だけ決めましょう。ほかの項目はあとからでも大丈夫です。"
            : "応募するときに、どの項目を企業に見せるかは毎回選べます。"
        }
      >
        プロフィール
      </PageTitle>
      <SeekerProfileForm
        initial={{
          displayName: profile?.displayName ?? "",
          desiredCategories: profile?.desiredCategories ?? [],
          desiredPrefectures: profile?.desiredPrefectures ?? [],
          experience: profile?.experience ?? "",
          qualifications: profile?.qualifications ?? "",
          selfIntroduction: profile?.selfIntroduction ?? "",
        }}
        next={typeof sp.next === "string" ? sp.next : undefined}
      />
    </Container>
  );
}
