"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { defineAction } from "@/server/action";
import { endEntitlement, grantEntitlement } from "@/server/domain/entitlement";
import { updateInquiry } from "@/server/domain/inquiry";
import {
  hideJob,
  hideSeekerPost,
  requestJobFix,
  setReportStatus,
  suspendUser,
  unhideJob,
  unsuspendUser,
} from "@/server/domain/moderation";

const id = z.uuid();
const reason = z.string().trim().min(1, "理由を書いてください").max(1000);

export const setReportStatusAction = defineAction(
  z.object({
    reportId: id,
    status: z.enum(["IN_REVIEW", "RESOLVED", "DISMISSED"]),
    note: z.string().max(2000).optional(),
  }),
  async (input, op) => {
    await setReportStatus(op, input.reportId, input.status, input.note);
    refresh();
  },
);

export const requestJobFixAction = defineAction(
  z.object({
    jobId: id,
    reason,
    days: z.number().int().min(1).max(14).default(3),
    reportId: id.optional(),
  }),
  async (input, op) => {
    await requestJobFix(op, input);
    refresh();
  },
);

export const hideJobAction = defineAction(
  z.object({ jobId: id, reason, reportId: id.optional() }),
  async (input, op) => {
    await hideJob(op, input);
    refresh();
  },
);

export const unhideJobAction = defineAction(z.object({ jobId: id, reason }), async (input, op) => {
  await unhideJob(op, input);
  refresh();
});

export const hideSeekerPostAction = defineAction(
  z.object({ postId: id, reason, reportId: id.optional() }),
  async (input, op) => {
    await hideSeekerPost(op, input);
    refresh();
  },
);

export const suspendUserAction = defineAction(
  z.object({ userId: id, reason, reportId: id.optional() }),
  async (input, op) => {
    await suspendUser(op, input);
    refresh();
  },
);

export const unsuspendUserAction = defineAction(
  z.object({ userId: id, reason }),
  async (input, op) => {
    await unsuspendUser(op, input);
    refresh();
  },
);

export const updateInquiryAction = defineAction(
  z.object({
    inquiryId: id,
    status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED"]),
    note: z.string().trim().min(1, "経過を書いてください").max(2000),
  }),
  async (input, op) => {
    await updateInquiry(op, input);
    refresh();
  },
);

export const grantEntitlementAction = defineAction(
  z.object({ email: z.email(), endsAt: z.string().optional() }),
  async (input, op) => {
    await grantEntitlement(op, {
      email: input.email,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
    });
    refresh();
  },
);

export const endEntitlementAction = defineAction(
  z.object({ entitlementId: id }),
  async (input, op) => {
    await endEntitlement(op, input.entitlementId);
    refresh();
  },
);
