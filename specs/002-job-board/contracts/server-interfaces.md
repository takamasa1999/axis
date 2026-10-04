# Contract: サーバー処理

**Plan**: [../plan.md](../plan.md) | **Data model**: [../data-model.md](../data-model.md)

001 の取り決め（Zod で入力を検証、`Result<T>` で返す、権限がなければ `NOT_FOUND`、重要な操作は AuditEvent に記録）をそのまま使う。
加えて、投稿・応募・メッセージ系の処理は最初に「メール確認済み」「停止されていない」を確認し、満たさなければ次を返す：

```ts
type ErrorCode = /* 001 の値 */ | "EMAIL_NOT_VERIFIED" | "SUSPENDED" | "BLOCKED";
```

## アカウント（`src/app/(auth)/actions.ts` ほか）

| Action | 入力 | ルール | 対応 |
|--------|------|--------|------|
| `signUp` | `{ kind: "PERSON" \| "EMPLOYER", email, password, agreeTerms: true, confirmAge? }` | 種類はこの2つだけ。求職者は `confirmAge`（18歳以上）が必須。パスワードの規則（FR-003）。規約の版と日時を記録。確認メールを送る | FR-001〜003, FR-046 |
| `signIn` | `{ email, password }` | ロック中なら `RATE_LIMITED`（ロック解除の時刻は出さない）。失敗回数を数え、10回でロックしてメールで知らせる | FR-004 |
| `requestPasswordReset` | `{ email }` | 登録の有無にかかわらず同じ応答 | FR-005 |
| `resetPassword` | `{ token, password }` | パスワードの規則。成功したら全セッションを無効にする | FR-005 |
| `resendVerification` | — | 1時間に3回まで | FR-002 |
| `updateNotificationSettings` | `{ notifyMessages, notifyJobAlerts }` | | FR-043 |
| `changePassword` | `{ current, next }` | | — |
| `deleteAccount` | `{ confirm: "退会する" }` | 公開中の求人・求職の投稿を終了／非公開、会話の相手には「退会したユーザー」と表示 | FR-044 |

## 企業（`src/app/(employer)/actions.ts`）

| Action | 入力 | ルール | 対応 |
|--------|------|--------|------|
| `saveEmployerProfile` | 企業プロフィール | | FR-008 |
| `saveJobDraft` | 求人の一部 | 下書きは未入力があってもよい | — |
| `publishJob` | `{ jobId, confirmations: { truthful, lawful, noLaborDispute } }` | [compliance-rules.md](./compliance-rules.md) のすべてを満たすこと。版を作り、`publishedAt`・`contentUpdatedAt`・`expiresAt`（+60日）を設定。1日10件まで | FR-009〜014 |
| `updateJob` | 求人の内容 | 公開中なら再検証し、新しい版を作る。労働条件の項目が変わり応募者がいれば `job-change-notice` を予約 | FR-014, FR-015 |
| `extendJob` | `{ jobId }` | 期限を今日から60日後に（`EXPIRED` も再公開） | FR-014 |
| `closeJob` | `{ jobId }` | `CLOSED` にする | FR-014 |
| `contactSeeker` | `{ seekerPostId, body }` | 求職の投稿が公開中、ブロックされていない、新しい会話は1日20件まで。会話（`EMPLOYER_CONTACT`）を作るか既存の会話に送る | US4 |

## 求職者（`src/app/(seeker)/actions.ts`）

| Action | 入力 | ルール | 対応 |
|--------|------|--------|------|
| `saveSeekerProfile` | プロフィール | 表示名だけ必須 | FR-021 |
| `apply` | `{ jobId, sharedFields[], firstMessage? }` | 求人が `PUBLISHED`、二重応募でない。共有した内容をコピーして保存。会話を作るか既存の会話を使い、SYSTEM「応募しました」＋（あれば）最初のメッセージを追加 | FR-022, FR-024 |
| `askQuestion` | `{ jobId, body }` | 応募せずに質問。会話（`INQUIRY`）を作る | FR-024 |
| `saveSeekerPost` / `publishSeekerPost` / `unpublishSeekerPost` | 求職の投稿 | 連絡先らしき文字列があれば `warnings` を返す（`acknowledgeWarnings: true` で公開できる）。公開中は3件まで | FR-031〜033 |
| `saveSearch` / `deleteSearch` | 検索条件・通知の有無 | 10件まで | FR-020 |

## 共通（`src/app/(messages)/actions.ts`）

| Action | 入力 | ルール | 対応 |
|--------|------|--------|------|
| `sendMessage` | `{ conversationId, body }` | 当事者、1〜2000文字、ブロック・停止・退会でない、10分で30件まで。本文を暗号化して保存。`message-digest` を5分後に予約 | FR-024〜028, FR-037 |
| `markRead` | `{ conversationId }` | 自分の既読時刻を更新 | FR-024 |
| `block` / `unblock` | `{ userId }` | | FR-028 |
| `report` | `{ targetType, targetId, reason, detail?, messageIds?[] }` | メッセージの通報では、通報者が当事者である会話のメッセージだけを選べる。選んだメッセージを提出物として平文で複製する | FR-034, FR-027 |
| `sendInquiry` | `{ email, category, body }` | ログイン不要。1つのメールアドレスで1時間5件まで | FR-036 |

## 運営（`src/app/(ops)/actions.ts`）

| Action | 入力 | ルール | 対応 |
|--------|------|--------|------|
| `startReview` / `resolveReport` / `dismissReport` | `{ reportId, note? }` | 初回の対応時刻を記録 | FR-035 |
| `requestJobFix` | `{ jobId, reason, deadline }` | 企業にメールと画面で修正を依頼。期限（既定3日）までに更新がなければ運営に知らせる | FR-016, FR-035 |
| `hideJob` / `unhideJob` | `{ jobId, reason }` | 内容は変えない | FR-016, FR-035 |
| `suspendUser` / `unsuspendUser` | `{ userId, reason }` | 停止中の利用者の公開中の投稿は一覧から外す | FR-035 |
| `updateInquiry` | `{ inquiryId, status, note }` | 経過を追記 | FR-036 |
| `grantEntitlement` / `endEntitlement` | `{ userId, feature, endsAt? }` | | FR-041 |

すべての運営の操作は `MODERATION_ACTION` などとして AuditEvent に記録する。

## Route Handlers

### `GET /api/conversations/[id]/messages?after=<messageId>` — メッセージの差分取得

- 認証：会話の当事者のみ（それ以外は 404）
- 応答：`{ messages: [{ id, kind, sender: "me" | "them" | "system", body, systemEvent?, createdAt }], counterpartLastReadAt }`
- `after` より後のメッセージだけを返す。画面は3秒ごと（非表示のときは30秒ごと）に呼ぶ
- 本文は復号して返す。ログに本文を出さない

### `GET /api/me/export` — データの持ち出し（求職者）

- プロフィール・求職の投稿・応募・送受信したメッセージ（＋Axis エンジンの記録）を JSON ファイル（`axis-export-YYYY-MM-DD.json`）で返す（FR-045）

### `GET /sitemap.xml` / `GET /robots.txt`

- 公開中の求人・企業ページをサイトマップに載せる。`/me`・`/employer`・`/messages`・`/ops`・`/seekers` は検索エンジンに載せない

### `GET /api/health`

- 001 と同じ
