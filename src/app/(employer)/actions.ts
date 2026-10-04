"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { defineAction } from "@/server/action";
import { EmployerProfileSchema, saveEmployerProfile } from "@/server/domain/employer";
import { closeJob, extendJob, publishJob, saveJob } from "@/server/domain/job-post";

const id = z.uuid();

export const saveEmployerProfileAction = defineAction(
  EmployerProfileSchema,
  async (input, actor) => {
    await saveEmployerProfile(actor, input);
  },
);

export const saveJobAction = defineAction(
  z.object({ jobId: id.nullable(), draft: z.record(z.string(), z.unknown()) }),
  async (input, actor) => saveJob(actor, input.jobId, input.draft),
);

export const publishJobAction = defineAction(
  z.object({
    jobId: id,
    confirmations: z.object({
      truthful: z.boolean(),
      lawful: z.boolean(),
      noLaborDispute: z.boolean(),
    }),
  }),
  async (input, actor) => publishJob(actor, input.jobId, input.confirmations),
);

export const extendJobAction = defineAction(z.object({ jobId: id }), async (input, actor) => {
  await extendJob(actor, input.jobId);
  refresh();
});

export const closeJobAction = defineAction(z.object({ jobId: id }), async (input, actor) => {
  await closeJob(actor, input.jobId);
  refresh();
});
