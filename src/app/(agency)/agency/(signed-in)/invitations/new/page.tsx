import { requireAgencyStaff } from "@/server/auth/guards";
import { listAgencyCas } from "@/server/domain/agency-seekers";
import { InvitationForm } from "./invitation-form";

export const metadata = { title: "案内を送る | Axis" };

export default async function NewInvitationPage() {
  const actor = await requireAgencyStaff();
  const membership = actor.memberships[0];
  const cas = await listAgencyCas(membership.agencyId);

  return (
    <div className="max-w-lg space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Axis の案内を送る</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          求職者のメールアドレスに、Axis の登録用リンク（14日間有効）を送ります。
        </p>
      </div>
      <InvitationForm
        agencyId={membership.agencyId}
        defaultCaId={membership.role === "CA" ? membership.memberId : null}
        cas={cas.map((c) => ({ id: c.id, name: c.user.name || c.user.email }))}
      />
    </div>
  );
}
