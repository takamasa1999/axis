"use server";

import { z } from "zod";
import { defineAction } from "@/server/action";
import { sendInvitation } from "@/server/domain/invitation";

export const sendInvitationAction = defineAction(
  z.object({
    agencyId: z.uuid(),
    email: z.email(),
    assignedCaId: z.uuid().nullable(),
  }),
  async (input, actor) => sendInvitation(actor, input),
);
