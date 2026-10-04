import { env } from "@/lib/env";
import { db } from "@/server/db";
import { jobChangedMail, sendMail } from "@/server/mail";

/** 応募した求人の労働条件が変わったことをメールで知らせる（T051 / FR-015） */
export async function handleJobChangeNotice(data: { jobPostId: string; seekerId: string }) {
  const [job, seeker] = await Promise.all([
    db.jobPost.findUnique({ where: { id: data.jobPostId }, select: { id: true, title: true } }),
    db.user.findUnique({ where: { id: data.seekerId }, select: { email: true, deletedAt: true } }),
  ]);
  if (!job || !seeker || seeker.deletedAt) return;
  await sendMail(jobChangedMail(seeker.email, `${env().APP_URL}/jobs/${job.id}`, job.title));
}
