import { Container, PageTitle } from "@/components/board/page-title";
import { requireMember } from "@/server/auth/guards";
import { db } from "@/server/db";
import { SettingsForms } from "./settings-forms";

export const metadata = { title: "設定 | Axis" };

export default async function SettingsPage() {
  const user = await requireMember("/settings");
  const prefs = await db.user.findUniqueOrThrow({
    where: { id: user.userId },
    select: { notifyMessages: true, notifyJobAlerts: true, email: true },
  });
  return (
    <Container narrow>
      <PageTitle lead={prefs.email}>設定</PageTitle>
      <SettingsForms
        kind={user.kind === "EMPLOYER" ? "EMPLOYER" : "PERSON"}
        notifyMessages={prefs.notifyMessages}
        notifyJobAlerts={prefs.notifyJobAlerts}
      />
    </Container>
  );
}
