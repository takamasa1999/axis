"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { MilestoneKind } from "@/generated/prisma/enums";
import { defineAction } from "@/server/action";
import { grantConsent, revokeConsent } from "@/server/domain/consent";
import { completeDialogue, startDialogue } from "@/server/domain/dialogue";
import { createMilestone } from "@/server/domain/milestone";
import { saveReflection } from "@/server/domain/reflection";
import { endRelationship } from "@/server/domain/relationship";

const id = z.uuid();

export const createMilestoneAction = defineAction(
  z.object({ kind: z.enum(MilestoneKind), title: z.string().trim().max(100).optional() }),
  async (input, actor) => {
    const milestone = await createMilestone(actor, input);
    redirect(`/milestones/${milestone.id}/dialogue`);
  },
);

export const startDialogueAction = defineAction(
  z.object({ milestoneId: id }),
  async (input, actor) => {
    await startDialogue(actor, input.milestoneId);
    refresh();
  },
);

export const completeDialogueAction = defineAction(
  z.object({ sessionId: id, milestoneId: id }),
  async (input, actor) => {
    await completeDialogue(actor, input.sessionId);
    redirect(`/milestones/${input.milestoneId}/reflection`);
  },
);

export const saveReflectionAction = defineAction(
  z.object({
    summaryId: id,
    baseVersionId: id,
    sections: z
      .array(
        z.object({
          aspect: z.enum(["FEELINGS", "MOTIVATION", "CRITERIA", "OPEN_QUESTIONS"]),
          content: z.string().trim().max(2000),
          isSensitive: z.boolean(),
        }),
      )
      .length(4),
  }),
  async (input, actor) => {
    const result = await saveReflection(actor, input);
    refresh();
    return result;
  },
);

export const grantConsentAction = defineAction(
  z.object({ relationshipId: id, versionId: id, itemIds: z.array(id).min(1) }),
  async (input, actor) => grantConsent(actor, input),
);

export const revokeConsentAction = defineAction(
  z.object({ consentId: id }),
  async (input, actor) => {
    await revokeConsent(actor, input.consentId);
    refresh();
  },
);

export const endRelationshipAction = defineAction(
  z.object({ relationshipId: id }),
  async (input, actor) => {
    await endRelationship(actor, input.relationshipId);
    refresh();
  },
);
