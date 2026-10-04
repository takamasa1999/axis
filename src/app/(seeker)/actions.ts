"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { defineAction } from "@/server/action";
import { apply, askQuestion } from "@/server/domain/application";
import { MESSAGE_MAX } from "@/server/domain/conversation";
import { deleteSavedSearch, saveSearch, updateSavedSearch } from "@/server/domain/saved-search";
import { SeekerProfileSchema, saveSeekerProfile } from "@/server/domain/seeker";
import {
  publishSeekerPost,
  SeekerPostSchema,
  saveSeekerPost,
  unpublishSeekerPost,
} from "@/server/domain/seeker-post";

const id = z.uuid();

export const saveSeekerProfileAction = defineAction(SeekerProfileSchema, async (input, actor) => {
  await saveSeekerProfile(actor, input);
});

export const applyAction = defineAction(
  z.object({
    jobId: id,
    sharedFields: z.array(z.string()).max(10),
    firstMessage: z.string().max(MESSAGE_MAX).optional(),
  }),
  async (input, actor) => apply(actor, input),
);

export const askQuestionAction = defineAction(
  z.object({ jobId: id, body: z.string().trim().min(1, "質問を書いてください").max(MESSAGE_MAX) }),
  async (input, actor) => askQuestion(actor, input),
);

export const saveSearchAction = defineAction(
  z.record(z.string(), z.unknown()),
  async (input, actor) => {
    await saveSearch(actor, input as never);
  },
);

export const updateSavedSearchAction = defineAction(
  z.object({ id, notify: z.boolean() }),
  async (input, actor) => {
    await updateSavedSearch(actor, input.id, input.notify);
    refresh();
  },
);

export const deleteSavedSearchAction = defineAction(z.object({ id }), async (input, actor) => {
  await deleteSavedSearch(actor, input.id);
  refresh();
});

export const saveSeekerPostAction = defineAction(
  z.object({ postId: id.nullable(), post: SeekerPostSchema }),
  async (input, actor) => saveSeekerPost(actor, input.postId, input.post),
);

export const publishSeekerPostAction = defineAction(
  z.object({ postId: id, acknowledgeWarnings: z.boolean().default(false) }),
  async (input, actor) => publishSeekerPost(actor, input.postId, input.acknowledgeWarnings),
);

export const unpublishSeekerPostAction = defineAction(
  z.object({ postId: id }),
  async (input, actor) => {
    await unpublishSeekerPost(actor, input.postId);
    refresh();
  },
);
