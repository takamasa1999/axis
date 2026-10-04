---

description: "Task list for 002 求人・求職の掲示板（Axis ボード）"
---

# Tasks: 求人・求職の掲示板（Axis ボード）

**Input**: Design documents from `specs/002-job-board/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: plan.md が、掲載ルールの単体テスト・アクセス権の表の契約テスト・結合テスト・E2E を原則VII の担保手段にしているため含める。

**Organization**: Setup → Foundational → US1〜US7（優先度順）→ 仕上げ

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並行して進められる（別ファイル・未完了タスクへの依存なし）
- **[Story]**: 対応する User Story（US1〜US7）

---

## Phase 1: Setup

- [ ] T001 pg-boss を追加し、`allowScripts` を必要に応じて更新する（`package.json`）
- [ ] T002 環境変数を追加・整理する：`MESSAGE_ENCRYPTION_KEY`（32バイトの base64、`v1:` などの世代付きで複数指定可）、`ENABLE_AGENCY_PILOT`（既定 false）、`TERMS_VERSION`（既定 `2026-10-draft`）。`REQUIRE_STAFF_2FA` は削除（`src/lib/env.ts`, `.env.example`, `.env.test`, `.env.local`）
- [ ] T003 [P] デザインのトークンを定義する：contracts/design-system.md の色（`--ink #1E1B2E` / `--paper #FFFDF6` / `--card #FFFFFF` / `--muted #5B5770` / `--sun #FFC83D` / `--coral #FF7A6B` / `--mint #42D6B0` / `--sky #7CC4FF` / `--lilac #C9B8FF` / `--link #2563C9` / `--danger #C62828` / `--sun-soft #FFF4CC` とダーク表示）、角丸、ふち取りと影 `4px 4px 0 var(--ink)`、shadcn の変数への対応づけ（`src/app/globals.css`）
- [ ] T004 [P] 書体 Zen Maru Gothic を `next/font/google` で読み込み、ルートレイアウトに適用する（`src/app/layout.tsx`）
- [ ] T005 [P] shadcn/ui の button・card・input・textarea・badge をデザインシステムに合わせて調整する（ピル型のボタン、高さ 48px、2px のふち取り＋影、押すと影が縮む）（`src/components/ui/`）
- [ ] T006 [P] マスターデータを作る：47都道府県、職種（14種、アイコン名と色付き）、雇用形態 `FULL_TIME | CONTRACT | PART_TIME | DISPATCH`、給与の種類、保険、受動喫煙の措置、年齢の例外理由6種（compliance-rules.md §3 の文言）、通報の理由（`src/lib/master-data.ts`）
- [ ] T007 [P] よく使われるパスワードの一覧と判定関数を作る（`src/lib/common-passwords.ts`）

---

## Phase 2: Foundational

### データベース

- [ ] T008 data-model.md のとおりに `prisma/schema.prisma` を変更する：`UserKind` に `EMPLOYER`、User に `failedLoginCount` / `lockedUntil` / `suspendedAt` / `suspendedReason` / `notifyMessages` / `notifyJobAlerts` / `termsVersion` / `termsAcceptedAt` / `ageConfirmedAt`。新規に EmployerProfile（companyName 1〜100文字ほか）、SeekerProfile（displayName 1〜30文字ほか）、JobPost（状態 `DRAFT | PUBLISHED | CLOSED | EXPIRED | HIDDEN` と FR-009 の全項目）、JobPostRevision（`(jobPostId, version)` 一意）、Application（`(jobPostId, seekerId)` 一意）、SeekerPost、Conversation（`(seekerId, employerId)` 一意）、Message（`kind USER | SYSTEM`、`bodyEncrypted`）、Block、Report、ReportEvidence、ModerationAction、Inquiry、SavedSearch、FeatureEntitlement。AuditEventType に data-model.md の15種を追加
- [ ] T009 マイグレーションを作って適用する。`CREATE EXTENSION IF NOT EXISTS pg_trgm` と、求人のタイトル・業務内容への trigram インデックスを含める（`prisma/migrations/`）
- [ ] T010 シードを 002 用に作り直す：運営1名、サンプルの企業2社（企業プロフィールと公開中の求人を計6件）、サンプルの求職者1名（プロフィールと求職の投稿1件）。001 の紹介会社のシードは `ENABLE_AGENCY_PILOT=true` のときだけ作る（`prisma/seed.ts`）

### 認証

- [ ] T011 Better Auth をメールアドレス＋パスワードに置き換える：`emailAndPassword`（`requireEmailVerification: true`、`minPasswordLength: 8`、`sendResetPassword`）、`emailVerification.sendVerificationEmail`、`magicLink`・`twoFactor` を外す。サインインの前後のフックで、ロック中なら拒否・失敗回数を数え、15分以内に10回失敗で15分ロックしてメールで知らせる（`src/server/auth/index.ts`, `src/lib/auth-client.ts`）
- [ ] T012 現在の利用者に `emailVerified`・`suspended` を加え、ガードを作る：`getOptionalUser`、`requireUser`、`requireSeeker`、`requireEmployer`、`requireOperator`、`assertCanAct`（メール未確認なら `EMAIL_NOT_VERIFIED`、停止中なら `SUSPENDED`）（`src/server/auth/session.ts`, `src/server/auth/guards.ts`, `src/lib/result.ts`）
- [ ] T013 登録の Server Action `signUp` を作る：種類は `PERSON | EMPLOYER` だけ、求職者は18歳以上の確認が必須、パスワードは8〜128文字でよく使われるものは拒否、規約の版と日時を記録、確認メールを送る（`src/server/domain/account.ts`, `src/app/(auth)/actions.ts`）
- [ ] T014 [P] 認証の画面を作る：`/signup`（種類を大きなカードで選ぶ → メール・パスワード・同意）、`/login`、`/forgot-password`、`/reset-password`、`/verify-email`（再送ボタン）（`src/app/(auth)/`）
- [ ] T015 [P] メールの文面を追加する：確認メール、パスワードの再設定、ロックのお知らせ、新着メッセージ、新着求人、修正依頼、労働条件の変更（`src/server/mail/templates.ts`）

### 権限・法令・共通部品

- [ ] T016 contracts/routes.md のアクセス権の表を `canBoard(actor, action, resource)` として実装する。運営が会話を読む操作は定義しない（`src/server/policy/board.ts`）
- [ ] T017 [P] アクセス権の表の全セルの契約テストを書く（`tests/contract/board-policy.test.ts`）
- [ ] T018 [P] メッセージ本文の暗号化・復号を作る（AES-256-GCM、`v1:iv:tag:ciphertext` 形式、鍵の世代で入れ替え可能）と単体テスト（`src/server/crypto/message.ts`, `tests/unit/crypto.test.ts`）
- [ ] T019 [P] 掲載ルールを作る：求人の公開時の必須項目（compliance-rules.md §1）、性別を限定する語句（§2 の「止める」「注意」の2区分）、年齢の条件と例外理由（§3）、連絡先の検出（§4）、労働条件の変更の判定（§5 の項目）（`src/server/compliance/job-post.ts`, `src/server/compliance/text-checks.ts`）
- [ ] T020 [P] 掲載ルールの単体テストを書く（`tests/unit/compliance.test.ts`）
- [ ] T021 [P] DB の件数による回数制限を作る：メッセージ 10分30件、新しい会話 1日20件、求人の新規公開 1日10件、お問い合わせ 1時間5件。超えたら `RATE_LIMITED` を AuditEvent に記録（`src/server/rate-limit-db.ts`）
- [ ] T022 pg-boss の設定とワーカーの起動を作る（`src/server/jobs/index.ts`, `src/instrumentation.ts`）。テストではワーカーを起動しない
- [ ] T023 [P] レイアウトを作る：ヘッダー（ロゴ・さがす・ログイン/マイページ）、スマートフォンの下部タブ（さがす／メッセージ／投稿する／マイページ）、フッター（利用規約・プライバシー・運営者情報・お問い合わせ）（`src/components/layout/`, `src/app/layout.tsx`）
- [ ] T024 001 の画面を整理する：`(person)` を `(axis)` に移して `/axis` 以下にする（`/axis`, `/axis/milestones/**`, `/axis/sharing`）、`(agency)` と `/invite` は `ENABLE_AGENCY_PILOT=false` で 404、`/agency/login`・`/agency/security`・`/home`・`/sharing` は転送する（`src/app/(axis)/`, `next.config.ts`）

**Checkpoint**: 登録 → 確認メール → ログイン → ロックが動き、`npm test`・`npm run test:contract` が通る

---

## Phase 3: User Story 1 - 企業が求人を投稿・公開する (Priority: P1) 🎯 MVP

**Goal**: 企業が登録し、法令で必要な労働条件を入れて求人を即時公開できる。掲載期限で自動終了する

**Independent Test**: quickstart.md シナリオ1

- [ ] T025 [P] [US1] 求人の状態遷移と公開ルールの結合テストを書く：必須項目の欠落で公開不可、性別の語句で公開不可、年齢の条件は例外理由が必須、公開で版1と掲載期限（+60日）、更新で版が増える、延長、募集終了、期限切れ、運営は内容を変えられない（`tests/integration/job-post.test.ts`）
- [ ] T026 [US1] 企業プロフィールのドメインを作る（`src/server/domain/employer.ts`）
- [ ] T027 [US1] 求人のドメインを作る：`saveJobDraft`、`publishJob`（確認3つ必須、1日10件まで、版を作る）、`updateJob`（公開中は再検証・新しい版、労働条件の変更で通知を予約）、`extendJob`、`closeJob`、`expireJobs`（`src/server/domain/job-post.ts`）
- [ ] T028 [US1] 企業の Server Actions を作る（`src/app/(employer)/actions.ts`）
- [ ] T029 [P] [US1] 企業のマイページを作る：公開中の求人、掲載期限の近い求人、新着メッセージ（`src/app/(employer)/employer/page.tsx`）
- [ ] T030 [P] [US1] 企業プロフィールの編集画面を作る（`src/app/(employer)/employer/profile/page.tsx`）
- [ ] T031 [P] [US1] 自社の求人の一覧を作る（状態ごと、延長・募集終了のボタン）（`src/app/(employer)/employer/jobs/page.tsx`）
- [ ] T032 [US1] 求人の作成・編集画面を作る：ステップ形式（①仕事の内容 ②働く場所 ③時間と休み ④給与と保険 ⑤確認して公開）、項目ごとの例と説明、性別・年齢の注意の表示、足りない項目の一覧（`src/app/(employer)/employer/jobs/new/page.tsx`, `src/app/(employer)/employer/jobs/[id]/edit/page.tsx`, `src/components/board/job-editor.tsx`）
- [ ] T033 [US1] 掲載期限のジョブ `job-expiry`（毎時）を作る（`src/server/jobs/job-expiry.ts`）

**Checkpoint**: 求人が公開できる

---

## Phase 4: User Story 2 - ログインせずに求人を探して読む (Priority: P1)

**Goal**: 誰でも求人を一覧・絞り込み・詳細で見られる

**Independent Test**: quickstart.md シナリオ2 の手順1

- [ ] T034 [P] [US2] 検索の結合テストを書く：公開中かつ期限内だけが出る、各絞り込み、キーワード、並び順（新着・給与）（`tests/integration/job-search.test.ts`）
- [ ] T035 [US2] 求人の検索を作る：キーワード（タイトル・業務内容・企業名の `ILIKE`）、職種・都道府県・雇用形態・給与の下限、並び順 `NEWEST | SALARY_DESC` のみ、20件ずつ（`src/server/domain/job-search.ts`）
- [ ] T036 [P] [US2] 求人カード・職種チップ・絞り込みフォーム・空の状態のイラストを作る（`src/components/board/`）
- [ ] T037 [US2] トップページを作る：キャッチコピー、検索ボックス、職種のアイコン、新着求人、企業向けの「求人を出す」導線（`src/app/(public)/page.tsx`）
- [ ] T038 [US2] 求人一覧を作る（条件は URL に保持、ページ送り）（`src/app/(public)/jobs/page.tsx`）
- [ ] T039 [US2] 求人の詳細を作る：労働条件を見出し付きで表示、掲載日・最終更新日、派遣の表示、年齢の例外理由、応募・質問ボタン（未ログインなら登録へ、終わったら戻る）、構造化データ `JobPosting`、メタ情報（`src/app/(public)/jobs/[id]/page.tsx`）
- [ ] T040 [P] [US2] 企業の紹介ページを作る（`src/app/(public)/companies/[id]/page.tsx`）
- [ ] T041 [P] [US2] サイトマップと robots を作る（`src/app/sitemap.ts`, `src/app/robots.ts`）

---

## Phase 5: User Story 3 - 応募・質問とメッセージ (Priority: P1)

**Goal**: 求職者が登録・応募し、企業と1対1でやり取りできる

**Independent Test**: quickstart.md シナリオ2 の手順2〜5

- [ ] T042 [P] [US3] 応募・メッセージの結合テストを書く：共有した項目だけが企業に見える、二重応募不可、終了した求人に応募不可、本文は暗号化して保存され当事者には復号して返る、ブロックで送信不可、回数制限、労働条件の変更で応募者に SYSTEM メッセージ（`tests/integration/messaging.test.ts`）
- [ ] T043 [US3] 求職者プロフィールのドメインと編集画面を作る（`src/server/domain/seeker.ts`, `src/app/(seeker)/me/profile/page.tsx`）
- [ ] T044 [US3] 会話のドメインを作る：`getOrCreateConversation`、`sendMessage`（暗号化・回数制限・ブロック・停止の確認、`message-digest` を5分後に予約）、`listConversations`（未読数）、`getMessagesAfter`、`markRead`、`block`・`unblock`、SYSTEM メッセージの追加（`src/server/domain/conversation.ts`）
- [ ] T045 [US3] 応募のドメインを作る：`apply`（共有項目のコピー、SYSTEM「応募しました」）、`askQuestion`（`src/server/domain/application.ts`）
- [ ] T046 [US3] 求職者と共通の Server Actions を作る（`src/app/(seeker)/actions.ts`, `src/app/(messages)/actions.ts`）
- [ ] T047 [US3] 応募画面を作る：共有する項目を選ぶ → 企業に見える内容の確認 → 最初のメッセージ（`src/app/(seeker)/jobs/[id]/apply/page.tsx`）
- [ ] T048 [US3] メッセージの差分取得 API を作る（`src/app/api/conversations/[id]/messages/route.ts`）
- [ ] T049 [US3] 会話の一覧と会話の画面を作る：3秒ごとの取得（非表示のときは30秒）、外部での連絡の注意、ブロック・通報の入口、応募の共有内容の表示（企業側）（`src/app/(messages)/messages/page.tsx`, `src/app/(messages)/messages/[conversationId]/page.tsx`）
- [ ] T050 [US3] 求職者のマイページを作る：応募した求人、新着メッセージ、プロフィールの入力状況（`src/app/(seeker)/me/page.tsx`）
- [ ] T051 [US3] ジョブ `message-digest`（未読なら新着をメールで、同じ会話は30分に1回まで）と `job-change-notice` を作る（`src/server/jobs/message-digest.ts`, `src/server/jobs/job-change-notice.ts`）

**Checkpoint**: 求人を出す → 探す → 応募してやり取りする が一通り動く（MVP）

---

## Phase 6: User Story 4 - 求職の投稿と企業からの声かけ (Priority: P2)

**Independent Test**: quickstart.md シナリオ3

- [ ] T052 [US4] 求職の投稿のドメインを作る：作成・編集・公開（連絡先の注意、公開中3件まで）・非公開、企業向けの一覧（ログインした企業だけ）（`src/server/domain/seeker-post.ts`）
- [ ] T053 [US4] 求職の投稿の画面を作る（`src/app/(seeker)/me/posts/`）
- [ ] T054 [US4] 企業向けの求職の投稿の一覧・詳細と声かけ（`contactSeeker`）を作る（`src/app/(employer)/seekers/page.tsx`, `src/app/(employer)/seekers/[postId]/page.tsx`）
- [ ] T055 [US4] 保存した検索条件のドメインと画面、ジョブ `job-alert`（毎朝8時、本人の条件だけで新着を集める）を作る（`src/server/domain/saved-search.ts`, `src/app/(seeker)/me/searches/page.tsx`, `src/server/jobs/job-alert.ts`）

---

## Phase 7: User Story 5 - 通報・運営の対応 (Priority: P2)

**Independent Test**: quickstart.md シナリオ4

- [ ] T056 [P] [US5] 通報の結合テストを書く：メッセージの通報では選んだメッセージだけが提出物になる、運営は提出物以外を読めない、修正依頼・非公開・解除、停止した利用者は操作できない（`tests/integration/moderation.test.ts`）
- [ ] T057 [US5] 通報のドメインと通報ダイアログを作る（`src/server/domain/report.ts`, `src/components/board/report-dialog.tsx`）
- [ ] T058 [US5] お問い合わせのドメインと `/contact` を作る（`src/server/domain/inquiry.ts`, `src/app/(public)/contact/page.tsx`）
- [ ] T059 [US5] 運営の対応のドメインを作る：`startReview`・`resolveReport`・`dismissReport`・`requestJobFix`（既定3日）・`hideJob`・`unhideJob`・`suspendUser`・`unsuspendUser`・`updateInquiry`。すべて ModerationAction と AuditEvent に記録（`src/server/domain/moderation.ts`）
- [ ] T060 [US5] 運営の画面を作る：ダッシュボード、通報の一覧・詳細、求人の確認、アカウント、お問い合わせ（`src/app/(ops)/ops/`）
- [ ] T061 [US5] 事業概況報告用の集計と画面を作る（`src/server/domain/metrics.ts`, `src/app/(ops)/ops/metrics/page.tsx`）
- [ ] T062 [US5] ジョブ `report-sla`（受付から1営業日を過ぎた未対応・修正依頼の期限切れを運営に知らせる）を作る（`src/server/jobs/report-sla.ts`）

---

## Phase 8: User Story 6 - アカウントの管理 (Priority: P3)

- [ ] T063 [US6] 設定画面を作る：通知の設定、パスワードの変更、データの持ち出し（求職者）、退会（`src/app/(messages)/settings/page.tsx`）
- [ ] T064 [US6] 退会のドメインを作る：公開中の求人を終了・求職の投稿を非公開、会話の相手には「退会したユーザー」、セッションを無効化（`src/server/domain/account.ts`）
- [ ] T065 [US6] データの持ち出しを作る（`src/app/api/me/export/route.ts`）

---

## Phase 9: User Story 7 - Axis エンジン（建て付け） (Priority: P3)

- [ ] T066 [US7] 利用権のドメインと運営の付与画面を作る（`src/server/domain/entitlement.ts`, `src/app/(ops)/ops/entitlements/page.tsx`）
- [ ] T067 [US7] `/axis` 以下に利用権の確認を入れ、`/axis-engine` に紹介ページを作る（利用権がなくても基本機能は使えることを明記）（`src/app/(axis)/axis/layout.tsx`, `src/app/(public)/axis-engine/page.tsx`）

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T068 [P] 利用規約・プライバシーポリシー・運営者情報の仮の文面を作る（専門家の確認前であることを明記）（`src/app/(public)/terms/page.tsx`, `src/app/(public)/privacy/page.tsx`, `src/app/(public)/company/page.tsx`）
- [ ] T069 [P] E2E を書く：quickstart.md のシナリオ1〜3（`tests/e2e/board.spec.ts`）
- [ ] T070 [P] README を書く（`README.md`）
- [ ] T071 quickstart.md のシナリオを通しで確認し、lint・typecheck・全テストを通す

---

## Dependencies & Execution Order

- **Setup → Foundational** は全 Story の前提
- **US1**（求人）→ **US2**（閲覧）は US1 の求人を表示する。US2 の画面は US1 と並行して作れる（シードの求人で確認）
- **US3**（応募・メッセージ）は US1・US2 の後
- **US4** は US3 の会話を使う。**US5** は US3 のメッセージ・US1 の求人を対象にする
- **US6**・**US7** は Foundational の後ならいつでも
- **Polish** は最後

```text
Setup → Foundational → US1 → US2 → US3 (MVP) → US4
                                         └────→ US5（一般公開の前に必須）
                    └→ US6, US7（並行可）
```

### Parallel Opportunities

- Setup：T003〜T007
- Foundational：T014・T015、T017〜T021、T023
- US1：T029〜T031、US2：T036・T040・T041

## Implementation Strategy

1. Setup と Foundational を終え、登録・ログインを確認する
2. US1 → US2 → US3 で MVP（求人を出す → 探す → 応募してやり取り）
3. US5（通報・運営）を加えて一般公開の準備。公開は plan.md「公開前に必要なこと」が済んでから
4. US4・US6・US7 で厚みを足す
