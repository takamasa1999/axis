"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { defineAction } from "@/server/action";
import { block, MESSAGE_MAX, markRead, sendMessage, unblock } from "@/server/domain/conversation";
import { createReport } from "@/server/domain/report";

const id = z.uuid();

export const sendMessageAction = defineAction(
  z.object({
    conversationId: id,
    body: z.string().trim().min(1, "メッセージを入れてください").max(MESSAGE_MAX),
  }),
  async (input, actor) => sendMessage(actor, input.conversationId, input.body),
);

export const markReadAction = defineAction(
  z.object({ conversationId: id }),
  async (input, actor) => {
    await markRead(actor, input.conversationId);
  },
);

export const blockAction = defineAction(z.object({ conversationId: id }), async (input, actor) => {
  await block(actor, input.conversationId);
  refresh();
});

export const unblockAction = defineAction(
  z.object({ conversationId: id }),
  async (input, actor) => {
    await unblock(actor, input.conversationId);
    refresh();
  },
);

export const reportAction = defineAction(
  z.object({
    targetType: z.enum(["JOB_POST", "SEEKER_POST", "MESSAGE", "USER"]),
    targetId: id,
    reason: z.enum([
      "ILLEGAL",
      "FALSE_INFO",
      "DISCRIMINATION",
      "HARASSMENT",
      "SPAM",
      "SCAM",
      "OTHER",
    ]),
    detail: z.string().max(2000).optional(),
    messageIds: z.array(id).max(20).optional(),
  }),
  async (input, actor) => createReport(actor, input),
);
