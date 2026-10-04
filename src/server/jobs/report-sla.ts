import { env } from "@/lib/env";
import { db } from "@/server/db";
import { sendMail } from "@/server/mail";

/**
 * 対応が遅れている通報・お問い合わせと、期限切れの修正依頼を運営に知らせる（T062 / SC-009、平日の朝9時）。
 * メールに通報・お問い合わせの内容は入れない（件数だけ）。
 */
export async function handleReportSla() {
  const oneBusinessDayAgo = new Date(
    Date.now() - (new Date().getDay() === 1 ? 3 : 1) * 24 * 60 * 60 * 1000,
  );
  const [reports, inquiries, overdueFixes] = await Promise.all([
    db.report.count({ where: { status: "OPEN", receivedAt: { lt: oneBusinessDayAgo } } }),
    db.inquiry.count({ where: { status: "OPEN", receivedAt: { lt: oneBusinessDayAgo } } }),
    db.moderationAction.count({
      where: { action: "REQUEST_FIX", fixDeadline: { lt: new Date() } },
    }),
  ]);
  if (reports + inquiries + overdueFixes === 0) return;
  const operators = await db.user.findMany({
    where: { kind: "STAFF", isOperator: true, deletedAt: null },
    select: { email: true },
  });
  for (const op of operators) {
    await sendMail({
      to: op.email,
      subject: "【Axis 運営】対応待ちがあります",
      text: [
        `受付から1営業日を過ぎた通報：${reports} 件`,
        `受付から1営業日を過ぎたお問い合わせ：${inquiries} 件`,
        `期限を過ぎた修正依頼：${overdueFixes} 件`,
        "",
        `${env().APP_URL}/ops`,
      ].join("\n"),
    });
  }
}
