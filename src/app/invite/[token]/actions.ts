"use server";

import { z } from "zod";
import { defineAction } from "@/server/action";
import { acceptInvitation } from "@/server/domain/invitation";

export const acceptInvitationAction = defineAction(
  z.object({ token: z.string().min(16).max(200) }),
  async (input, actor) => acceptInvitation(actor, input.token),
);
