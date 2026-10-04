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

// ============================================================
// 002 掲示板（T015）。本文にメッセージの内容や個人の記録は入れない
// ============================================================

const SIGNATURE = [
  "",
  "――",
  "Axis（求人・求職の掲示板）",
  "このメールに心当たりがない場合は、破棄してください。",
].join("\n");

export function verificationMail(to: string, url: string): MailMessage {
  return {
    to,
    subject: "【Axis】メールアドレスの確認",
    text: [
      "Axis にご登録いただき、ありがとうございます。",
      "次のリンクを開くと登録が完了し、そのままログインできます（有効期限は24時間です）。",
      "",
      url,
      SIGNATURE,
    ].join("\n"),
  };
}

export function passwordResetMail(to: string, url: string): MailMessage {
  return {
    to,
    subject: "【Axis】パスワードの再設定",
    text: [
      "パスワードの再設定を受け付けました。",
      "次のリンクから新しいパスワードを設定してください（有効期限は1時間です）。",
      "",
      url,
      SIGNATURE,
    ].join("\n"),
  };
}

export function lockedMail(to: string, minutes: number): MailMessage {
  return {
    to,
    subject: "【Axis】ログインを一時的に止めました",
    text: [
      "パスワードの誤入力が続いたため、安全のため、あなたのアカウントへのログインを一時的に止めました。",
      `${minutes}分ほどたつと、またログインできるようになります。`,
      "",
      "ご自身の操作でない場合は、パスワードの再設定をおすすめします。",
      SIGNATURE,
    ].join("\n"),
  };
}

export function newMessageMail(to: string, url: string, counterpartName: string): MailMessage {
  return {
    to,
    subject: `【Axis】${counterpartName} さんから新しいメッセージが届いています`,
    text: [
      `${counterpartName} さんから、Axis で新しいメッセージが届いています。`,
      "内容は Axis にログインして確認してください。",
      "",
      url,
      "",
      "（通知は「設定」から止められます）",
      SIGNATURE,
    ].join("\n"),
  };
}

export function jobAlertMail(to: string, url: string, count: number): MailMessage {
  return {
    to,
    subject: `【Axis】保存した条件に合う新着求人が ${count} 件あります`,
    text: [
      `保存した検索条件に合う新しい求人が ${count} 件見つかりました。`,
      "",
      url,
      "",
      "（通知は「保存した条件」から止められます）",
      SIGNATURE,
    ].join("\n"),
  };
}

export function jobFixRequestMail(
  to: string,
  url: string,
  jobTitle: string,
  reason: string,
  deadline: Date,
): MailMessage {
  return {
    to,
    subject: "【Axis】求人の修正のお願い",
    text: [
      `求人「${jobTitle}」について、修正をお願いします。`,
      "",
      `理由：${reason}`,
      `期限：${deadline.toLocaleDateString("ja-JP")}`,
      "",
      "期限までに修正されない場合、求人の掲載を止めることがあります。",
      url,
      SIGNATURE,
    ].join("\n"),
  };
}

export function jobChangedMail(to: string, url: string, jobTitle: string): MailMessage {
  return {
    to,
    subject: "【Axis】応募した求人の労働条件が変更されました",
    text: [
      `あなたが応募した求人「${jobTitle}」の労働条件が変更されました。`,
      "変更後の内容を確認してください。",
      "",
      url,
      SIGNATURE,
    ].join("\n"),
  };
}
