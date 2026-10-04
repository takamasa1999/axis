"use client";

import { hideJobAction, requestJobFixAction, unhideJobAction } from "../../actions";
import { ReasonAction } from "../../reason-action";

export function JobModeration({ jobId, hidden }: { jobId: string; hidden: boolean }) {
  return (
    <section className="pop-card flex flex-wrap gap-2 p-5">
      {hidden ? (
        <ReasonAction
          label="非公開を解除"
          variant="default"
          onRun={(reason) => unhideJobAction({ jobId, reason })}
        />
      ) : (
        <>
          <ReasonAction
            label="修正を依頼"
            onRun={(reason) => requestJobFixAction({ jobId, reason, days: 3 })}
          />
          <ReasonAction
            label="求人を非公開"
            variant="destructive"
            onRun={(reason) => hideJobAction({ jobId, reason })}
          />
        </>
      )}
    </section>
  );
}
