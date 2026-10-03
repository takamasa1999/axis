import "server-only";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import nodemailer from "nodemailer";
import { env } from "@/lib/env";
import type { MailMessage } from "./templates";

/**
 * メール送信（T018）。
 * MAIL_TRANSPORT=smtp ならローカルの Mailpit、ses なら Amazon SES に送る。
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const e = env();
  if (e.MAIL_TRANSPORT === "ses") {
    const client = new SESv2Client({ region: e.AWS_REGION });
    await client.send(
      new SendEmailCommand({
        FromEmailAddress: e.MAIL_FROM,
        Destination: { ToAddresses: [message.to] },
        Content: {
          Simple: {
            Subject: { Data: message.subject, Charset: "UTF-8" },
            Body: { Text: { Data: message.text, Charset: "UTF-8" } },
          },
        },
      }),
    );
    return;
  }

  const transport = nodemailer.createTransport({
    host: e.SMTP_HOST,
    port: e.SMTP_PORT,
    secure: false,
  });
  await transport.sendMail({
    from: e.MAIL_FROM,
    to: message.to,
    subject: message.subject,
    text: message.text,
  });
}

export { invitationMail, magicLinkMail } from "./templates";
