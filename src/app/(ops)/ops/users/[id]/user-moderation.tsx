"use client";

import { suspendUserAction, unsuspendUserAction } from "../../actions";
import { ReasonAction } from "../../reason-action";

export function UserModeration({ userId, suspended }: { userId: string; suspended: boolean }) {
  return (
    <section className="pop-card flex flex-wrap gap-2 p-5">
      {suspended ? (
        <ReasonAction
          label="停止を解除"
          variant="default"
          onRun={(reason) => unsuspendUserAction({ userId, reason })}
        />
      ) : (
        <ReasonAction
          label="アカウントを停止"
          variant="destructive"
          onRun={(reason) => suspendUserAction({ userId, reason })}
        />
      )}
    </section>
  );
}
