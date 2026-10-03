/** メールの文面（T018）。本文に個人の記録は入れない */
export type MailMessage = { to: string; subject: string; text: string };

export function magicLinkMail(to: string, url: string): MailMessage {
  return {
    to,
    subject: "Axis へのログインリンク",
    text: [
      "Axis にログインするには、次のリンクを開いてください。",
      "",
      url,
      "",
      "このリンクの有効期限は15分です。心当たりがない場合は、このメールを破棄してください。",
    ].join("\n"),
  };
}

export function invitationMail(to: string, url: string, agencyName: string): MailMessage {
  return {
    to,
    subject: `${agencyName} から Axis のご案内`,
    text: [
      `${agencyName} から、Axis のご案内が届いています。`,
      "",
      "Axis は、CA との面談の前に、あなた自身の考えや大切にしたいことを整理するためのサービスです。",
      "答えを決めるのはあなたです。整理した内容を紹介会社に共有するかどうかも、あなたが選べます。",
      "",
      url,
      "",
      "このご案内の有効期限は14日です。",
    ].join("\n"),
  };
}
