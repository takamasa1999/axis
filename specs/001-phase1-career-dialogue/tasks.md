---

description: "Task list for Phase1 本人起点のキャリア対話と許可制共有"
---

# Tasks: Phase1 本人起点のキャリア対話と許可制共有

**Input**: Design documents from `specs/001-phase1-career-dialogue/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: plan.md の Constitution Check が、アクセス権の表の自動テスト（原則IV）と AI の評価テスト（原則II）を担保手段にしているため、
それらと各 Story の E2E を含める。それ以外の単体テストは任意。

**Organization**: Setup → Foundational（ローカル開発の土台）→ User Story ごと（P1〜P6）→ AWS 本番 → 仕上げ

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並行して進められる（別ファイル・未完了タスクへの依存なし）
- **[Story]**: 対応する User Story（US1〜US6）
- パスはリポジトリ直下からの相対パス（plan.md の Project Structure に従う）

---

## Phase 1: Setup（プロジェクトの初期化・ローカル環境）

**Purpose**: Next.js アプリの骨組みと、ローカルで動かすための道具をそろえる

- [ ] T001 Next.js（App Router・TypeScript・Tailwind CSS・`src/` ディレクトリ）のプロジェクトをリポジトリ直下に作成し、`package.json` の `engines.node` を `>=24` にする（`package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`）
- [ ] T002 `next.config.ts` に `output: "standalone"` を設定し、`typedRoutes` を有効にする
- [ ] T003 [P] Biome を導入し、ESLint の設定を削除する。`npm run lint` / `npm run format` を定義する（`biome.json`, `package.json`）
- [ ] T004 [P] `docker-compose.yml` を作成する：`postgres`（17、ポート 5432、ボリューム永続化、ヘルスチェック付き）と `mailpit`（SMTP 1025 / Web 8025）。`app` サービスは `profiles: ["app"]` にして `Dockerfile` からビルドする
- [ ] T005 [P] `.env.example` を作成する：`DATABASE_URL`, `APP_URL=http://localhost:3000`, `BETTER_AUTH_SECRET`, `AI_PROVIDER=mock`, `AI_MODEL_ID`, `ANTHROPIC_API_KEY`, `AWS_REGION=ap-northeast-1`, `MAIL_TRANSPORT=smtp`, `SMTP_HOST=localhost`, `SMTP_PORT=1025`, `MAIL_FROM`
- [ ] T006 [P] 環境変数を Zod で検証して型付きで読み出すモジュールを作る。起動時に不足があればエラーにする（`src/lib/env.ts`）
- [ ] T007 [P] shadcn/ui を初期化し、基本の部品（button, input, textarea, card, checkbox, dialog, badge, label, form, sonner）を追加する（`components.json`, `src/components/ui/`）
- [ ] T008 [P] Vitest を設定する（`vitest.config.ts`、パスエイリアス `@/`、`tests/unit`・`tests/integration`・`tests/contract` を対象）。`npm test` / `npm run test:contract` を定義する
- [ ] T009 [P] Playwright を設定する（`playwright.config.ts`、`webServer` で `npm run dev` を起動、`tests/e2e/`）。`npm run test:e2e` を定義する
- [ ] T010 [P] マルチステージの `Dockerfile`（deps → build → runner、`node:24-slim`、非 root ユーザー、standalone 出力をコピー、`PORT=3000`）と `.dockerignore` を作成する
- [ ] T011 `package.json` に `typecheck`（`tsc --noEmit`）, `db:migrate`, `db:seed`, `db:studio` スクリプトを追加する

---

## Phase 2: Foundational（すべての Story の前提）

**Purpose**: DB・認証・権限・監査・AI・メールの土台。**ここが終わるまで Story の実装を始めない**

### データベース

- [ ] T012 Prisma を導入し、data-model.md の全エンティティを `prisma/schema.prisma` に定義する：User（`kind` enum `PERSON` | `STAFF`、`isOperator`、`deletedAt`）, PersonalAxis（`userId` 一意、紹介会社への外部キーを持たない）, Milestone（`kind` enum `JOB_SEARCH` | `CAREER_CHANGE` | `PROMOTION_TRANSFER` | `RESKILLING` | `LIFE_EVENT`）, DialogueSession（`status` enum `NOT_STARTED` | `IN_PROGRESS` | `PAUSED` | `COMPLETED` | `SAFETY_STOPPED`、`modality` enum `TEXT` | `VOICE`）, DialogueMessage（`role` `PERSON` | `AXIS`、`kind` `ANSWER` | `QUESTION` | `MATERIAL` | `SAFETY` | `INTRO`）, ReflectionSummary（`sessionId` 一意）, ReflectionVersion（`versionNo`、`createdBy` `AI` | `PERSON`）, ReflectionSection（`aspect` `FEELINGS` | `MOTIVATION` | `CRITERIA` | `OPEN_QUESTIONS`、`isSensitive`）, RecordEntry（`type` `VALUES` | `CONCERNS` | `CRITERIA_VISION` | `OPTIONS_COMPARED` | `REASON`、`source` `DIALOGUE` | `PERSON`）, DecisionRecord（`decision` `APPLY` | `DECLINE` | `ACCEPT_OFFER` | `STAY` | `OTHER`）, DecisionOption, AgencyRelationship（`status` `INVITED` | `ACTIVE` | `ENDED`、`(axisId, agencyId)` 一意）, SharingConsent（`supersededById`）, SharedSnapshot（`consentId` 一意）, SharedSnapshotItem（`sourceKind` `REFLECTION_SECTION` | `RECORD_ENTRY` | `DECISION`）, Agency（`status` `PILOT` | `PAID_PILOT` | `CONTRACTED` | `ENDED`）, AgencyMember（`role` `CA` | `ADMIN`）, Invitation（`tokenHash`、`expiresAt`、`acceptedAt`）, AuditEvent（`type` enum は data-model.md の13種、`metadata` json）。ID は UUID v7、日時は UTC
- [ ] T013 初回マイグレーションを作成し、ローカルの PostgreSQL に適用する（`prisma/migrations/`）
- [ ] T014 [P] Prisma クライアントのシングルトンを作る（開発時のホットリロードで接続が増えないようにする）（`src/server/db.ts`）
- [ ] T015 [P] シードを作る：検証用の紹介会社1社（`PILOT`）、管理者1名（ADMIN）、CA 2名、運営1名。パスワードは `.env.example` に記載した開発用の値を使う（`prisma/seed.ts`）

### 認証

- [ ] T016 Better Auth を設定する：Prisma アダプター、本人向けのマジックリンク、STAFF 向けのメール＋パスワードと TOTP 二要素認証。認証用のテーブルを `prisma/schema.prisma` に追加してマイグレーションする（`src/server/auth/index.ts`, `src/app/api/auth/[...all]/route.ts`）
- [ ] T017 [P] サーバー側で現在の利用者を取得するヘルパーを作る：`getSessionUser()` が `{ user, kind, axisId?, memberships[] }` を返す（`src/server/auth/session.ts`）
- [ ] T018 [P] メール送信を作る：`MAIL_TRANSPORT=smtp` なら nodemailer で Mailpit に、`ses` なら AWS SES に送る。マジックリンクと利用案内のテンプレートを持つ（`src/server/mail/index.ts`, `src/server/mail/templates.ts`）

### 権限・監査・共通

- [ ] T019 contracts/routes.md の「アクセス権の表」をそのままコードにする：`can(actor, action, resource)` を唯一の判定関数として実装し、権限がない場合は存在を明かさず `NOT_FOUND` とする（`src/server/policy/index.ts`）
- [ ] T020 [P] CA が共有スナップショットを読める条件（担当CA または ADMIN／関係が `ACTIVE`／許可が `revokedAt IS NULL AND supersededById IS NULL`／本人が削除されていない）を Prisma の where 条件として1か所に定義する（`src/server/policy/snapshot-access.ts`）
- [ ] T021 [P] 操作履歴の記録関数を作る。`metadata` に本文を入れないよう型で制限し（ID・件数・版番号のみ）、トランザクションを受け取れるようにする（`src/server/audit/index.ts`）
- [ ] T022 [P] 共通の `Result<T>` 型・`ErrorCode`（`UNAUTHENTICATED` | `NOT_FOUND` | `VALIDATION` | `CONFLICT` | `RATE_LIMITED` | `INTERNAL`）と、Server Action を Zod 検証付きで定義するラッパーを作る（`src/lib/result.ts`, `src/server/action.ts`）
- [ ] T023 [P] 本文をログに出さないロガーを作る（`content` / `text` などのキーを自動で伏せる）（`src/server/logger.ts`）
- [ ] T024 [P] ルートグループのレイアウトでログインと役割を確認する：`(person)` は PERSON、`(agency)` は STAFF かつ所属あり、`(ops)` は `isOperator`（`src/app/(person)/layout.tsx`, `src/app/(agency)/agency/layout.tsx`, `src/app/(ops)/ops/layout.tsx`）
- [ ] T025 [P] ヘルスチェックを作る：DB に接続できれば `200 { status: "ok" }`（`src/app/api/health/route.ts`）
- [ ] T026 [P] 1人あたりの回数制限（メモリ上のスライディングウィンドウ。対話は1分20回、利用案内は1社1日100件）を作る（`src/server/rate-limit.ts`）

### AI の土台

- [ ] T027 AI プロバイダーの切り替えを作る：`AI_PROVIDER` が `bedrock` なら `@ai-sdk/amazon-bedrock`、`anthropic` なら `@ai-sdk/anthropic`、`mock` ならモック。モデル ID は `AI_MODEL_ID` から読む（`src/server/ai/provider.ts`）
- [ ] T028 [P] contracts/ai-dialogue.md の Zod スキーマ `AxisTurn`（`kind` `QUESTION` | `MATERIAL` | `SAFETY`、`text` 1〜1200文字、`coverage` 各 0〜2、`readyToSummarize`）と `ReflectionDraft`（`sections` ちょうど4件・各 `content` 最大2000文字・`sensitiveHint`、`recordEntries` 各最大1000文字）を定義する（`src/server/ai/schemas.ts`）
- [ ] T029 [P] モックのプロバイダーを作る：観点を順番に問う固定の応答を返し、4ターン目で `readyToSummarize: true`、要約では本人の発言をそのまま4観点に振り分ける（`src/server/ai/mock.ts`）

### テストの土台

- [ ] T030 [P] 結合テスト用に、テストごとに DB を空にするヘルパーと、本人・CA・管理者・運営を作るファクトリーを作る（`tests/helpers/db.ts`, `tests/helpers/factories.ts`）
- [ ] T031 アクセス権の表の全セル（6操作 × 5種類の利用者）を確認する契約テストを書く（`tests/contract/policy.test.ts`）

**Checkpoint**: `docker compose up -d && npm run db:migrate && npm run db:seed && npm run dev` で起動し、`/api/health` が 200、シードの CA でログインでき、`npm test` と `npm run test:contract` が通る

---

## Phase 3: User Story 1 - 対話で現状と判断軸を整理する (Priority: P1) 🎯 MVP

**Goal**: 本人が登録し、AI と対話して4観点の整理結果を受け取る（本人だけで完結）

**Independent Test**: quickstart.md シナリオ1の手順2〜5。CA 向け機能がなくても、登録 → 説明 → 対話 → 中断・再開 → 整理結果まで確認できる

### Tests for User Story 1

- [ ] T032 [P] [US1] AI の評価テストを書く：contracts/ai-dialogue.md §5 の6ケース。判定の有無は LLM による判定とキーワードの両方で確認する。`AI_PROVIDER=mock` のときはスキップする（`tests/ai-eval/dialogue.eval.test.ts`）。`npm run test:ai-eval` を定義する
- [ ] T033 [P] [US1] E2E を書く：案内リンクから登録 → 対話の説明（目的・所要時間・答えは本人が決める・共有は許可制）の表示 → 4ターンの対話 → 中断・再開 → 整理結果の表示（`tests/e2e/us1-dialogue.spec.ts`）

### Implementation for User Story 1

- [ ] T034 [P] [US1] 対話用のシステムプロンプトを作る：応答は問いか考える材料だけ、判定・推奨・「今は転職しない」の否定の禁止、4観点の進め方、過去の記録を差し込む枠（`src/server/ai/prompts/dialogue.ts`）
- [ ] T035 [P] [US1] 整理結果用のプロンプトを作る：本人の言葉をできるだけそのまま使う、機微な内容に `sensitiveHint` を付ける（`src/server/ai/prompts/reflection.ts`）
- [ ] T036 [P] [US1] 危険な兆候の判定と固定の案内文（相談窓口の一覧）を作る（`src/server/ai/safety.ts`）
- [ ] T037 [US1] 1ターンの応答を作る：構造化出力 → `AxisTurn` で検証 → 失敗したら1回だけ再生成 → それでも失敗したら定型のお詫び文（`src/server/ai/dialogue.ts`）
- [ ] T038 [US1] 利用案内の受け入れを作る：`acceptInvitation({ token, email })`。トークンのハッシュ一致・有効期限内（14日）・未使用を確認し、初回なら User（PERSON）と PersonalAxis を作り、AgencyRelationship を `ACTIVE` にしてマジックリンクを送る。`INVITATION_ACCEPTED` を記録する（`src/server/domain/invitation.ts`, `src/app/invite/[token]/actions.ts`）
- [ ] T039 [US1] 節目と対話のドメインを作る：`createMilestone`, `startDialogue`（進行中・中断中があれば再開）、状態遷移（30分操作なしで `PAUSED`）、`completeDialogue`（`ReflectionDraft` を作り ReflectionSummary / ReflectionVersion v1 / ReflectionSection / RecordEntry（`source: DIALOGUE`）を保存）。`SESSION_STARTED` / `SESSION_COMPLETED` / `SESSION_SAFETY_STOPPED` を記録する（`src/server/domain/milestone.ts`, `src/server/domain/dialogue.ts`）
- [ ] T040 [US1] 対話のストリーミング API を作る：`POST /api/dialogue/[sessionId]/messages`、本文は1〜4,000文字、本人（持ち主）のみ、1分20回まで（超えたら 429）、危険な兆候なら `SAFETY` を返してセッションを `SAFETY_STOPPED` にする（`src/app/api/dialogue/[sessionId]/messages/route.ts`）
- [ ] T041 [P] [US1] 利用案内の受け入れ画面とログイン画面（マジックリンク送信・送信済みの表示）を作る（`src/app/invite/[token]/page.tsx`, `src/app/(auth)/login/page.tsx`）
- [ ] T042 [P] [US1] 本人のホーム画面を作る：節目の一覧、新しい節目の作成、続きの対話への導線（`src/app/(person)/home/page.tsx`）
- [ ] T043 [US1] 対話画面を作る：始める前の説明（FR-002）→ AI SDK の `useChat` によるストリーミング表示、`QUESTION` / `MATERIAL` の見た目の区別、4観点の進み具合の表示、`readyToSummarize` で終了ボタンを出す、`SAFETY` で入力を止めて案内を表示（`src/app/(person)/milestones/[id]/dialogue/page.tsx`, `src/components/dialogue/`）
- [ ] T044 [US1] 整理結果の表示画面（読み取りのみ。修正は US2）を作る（`src/app/(person)/milestones/[id]/reflection/page.tsx`）

**Checkpoint**: US1 だけで、簡易試作の検証（求職者5〜10名）に使える

---

## Phase 4: User Story 2 - 確認・修正し、共有範囲を選んで許可する (Priority: P2)

**Goal**: 本人が整理結果を修正し、項目を選んで許可・取り消しできる

**Independent Test**: quickstart.md シナリオ1の手順5〜7・9〜10（CA の画面は使わず、スナップショットの中身を DB で確認してもよい）

### Tests for User Story 2

- [ ] T045 [P] [US2] 共有の結合テストを書く：0件では許可できない／許可でスナップショットが作られる／再許可で前の許可が `supersededById` で置き換わる／再許可するまで前の版が見える／取り消し後は読めない／古い確認画面の版 ID では `CONFLICT`（`tests/integration/consent.test.ts`）
- [ ] T046 [P] [US2] E2E を書く：整理結果を修正 → 何も選ばないと許可できない → 2項目を選び確認画面で相手に見える内容を確認 → 許可 → 取り消し → 操作履歴に残る（`tests/e2e/us2-consent.spec.ts`）

### Implementation for User Story 2

- [ ] T047 [US2] 整理結果の修正を作る：`saveReflection({ summaryId, baseVersionId, sections[] })` で新しい版を作る。`baseVersionId` が最新でなければ `CONFLICT`（`src/server/domain/reflection.ts`）
- [ ] T048 [US2] 共有のドメインを作る：`previewShare`（保存しない）、`grantConsent`（items が0件なら `VALIDATION`、送信された版 ID が確認画面の版と一致すること、以前の有効な許可を `supersededById` で置き換え、SharedSnapshot / SharedSnapshotItem を同じトランザクションで作り `CONSENT_GRANTED` / `CONSENT_SUPERSEDED` を記録）、`revokeConsent`（`CONSENT_REVOKED`）（`src/server/domain/consent.ts`）
- [ ] T049 [P] [US2] 整理結果の画面に修正機能を追加する（`src/app/(person)/milestones/[id]/reflection/page.tsx`, `src/components/reflection/ReflectionEditor.tsx`）
- [ ] T050 [US2] 共有画面を作る：項目の選択（既定はすべて未選択、`isSensitive` の項目には注意書き）→ 確認（共有先の会社名と相手に見える内容をそのまま表示）→ 許可（`src/app/(person)/milestones/[id]/share/[relationshipId]/page.tsx`）
- [ ] T051 [US2] 共有の管理画面を作る：共有先ごとの有効な許可・取り消しボタン・操作履歴（自分の AuditEvent）（`src/app/(person)/sharing/page.tsx`）

**Checkpoint**: 許可していない内容がスナップショットに入らないことを結合テストで確認できる

---

## Phase 5: User Story 3 - CA が許可された要約を面談前に確認する (Priority: P3)

**Goal**: CA が利用案内を送り、担当求職者の状態と許可済み要約だけを見て、コピー・CSV で取り出せる

**Independent Test**: quickstart.md シナリオ1の手順1・8〜10

### Tests for User Story 3

- [ ] T052 [P] [US3] CSV の契約テストを書く：列が `relationship_id, agency_name, consented_at, version_no, item_label, item_content`、BOM 付き UTF-8、条件を満たさないと 404、`SNAPSHOT_EXPORTED` が記録される（`tests/contract/snapshot-csv.test.ts`）
- [ ] T053 [P] [US3] E2E を書く：CA が案内を送る → 本人が許可 → CA に選んだ項目だけが見え、全文は見えない → 本人が取り消すと「取り消されました」だけになる → 担当外の CA は開けない（`tests/e2e/us3-ca-view.spec.ts`）

### Implementation for User Story 3

- [ ] T054 [US3] 利用案内の送信を作る：`sendInvitation({ email, assignedCaId? })`、トークンを作ってハッシュで保存、有効期限14日、1社1日100件まで、メール送信、`INVITATION_SENT` を記録（`src/server/domain/invitation.ts`, `src/app/(agency)/agency/invitations/new/actions.ts`）
- [ ] T055 [US3] 求職者の状態一覧のクエリを作る：案内済み／対話中／未完了／許可待ち／共有あり／取り消し／終了 を、内容を読まずに判定する（`src/server/domain/agency-seekers.ts`）
- [ ] T056 [US3] スナップショットの読み取りを作る：T020 の条件でだけ取得し、`SNAPSHOT_VIEWED` を記録（`src/server/domain/snapshot.ts`）
- [ ] T057 [P] [US3] 紹介会社のログイン画面（メール＋パスワード＋TOTP）を作る（`src/app/(agency)/agency/login/page.tsx`）
- [ ] T058 [P] [US3] 利用案内の送信画面を作る（`src/app/(agency)/agency/invitations/new/page.tsx`）
- [ ] T059 [US3] 担当求職者の一覧画面を作る（CA は自分の担当のみ、ADMIN は全員）（`src/app/(agency)/agency/seekers/page.tsx`）
- [ ] T060 [US3] 許可済み要約の画面を作る：項目の表示、整形済みテキストのコピーボタン、CSV ダウンロード。許可がなければ状態だけを表示（`src/app/(agency)/agency/seekers/[relationshipId]/page.tsx`）
- [ ] T061 [US3] CSV 出力を作る：`GET /api/agency/relationships/[relationshipId]/snapshot.csv`（`src/app/api/agency/relationships/[relationshipId]/snapshot.csv/route.ts`）
- [ ] T062 [P] [US3] CA の追加・無効化の画面を作る（ADMIN のみ）（`src/app/(agency)/agency/members/page.tsx`, `src/server/domain/agency-members.ts`）

**Checkpoint**: 共同検証（資料 STEP6）に使える

---

## Phase 6: User Story 4 - 選択と理由を記録する (Priority: P4)

**Goal**: 本人が求人を判断軸と並べて比べ、選択（「今は転職しない」を含む）と理由を残す

**Independent Test**: quickstart.md シナリオ3

- [ ] T063 [P] [US4] E2E を書く：2件を判断軸と並べて比較 → `STAY` を選んで理由を書く → 転職を促す表示がない → 共有画面で既定では選ばれていない（`tests/e2e/us4-decision.spec.ts`）
- [ ] T064 [US4] 選択のドメインを作る：`recordDecision({ milestoneId, decision, reason, options[] })`（`decision` は `APPLY` | `DECLINE` | `ACCEPT_OFFER` | `STAY` | `OTHER`、`STAY` も同じ扱い）、`saveRecordEntry({ milestoneId, type, content })`（`src/server/domain/decision.ts`, `src/server/domain/record-entry.ts`）
- [ ] T065 [US4] 選択の記録画面を作る：選択肢ごとに本人の判断軸（`CRITERIA` の整理結果）の列を並べた比較表、選択と理由の入力（`src/app/(person)/milestones/[id]/decisions/page.tsx`, `src/components/decision/`）
- [ ] T066 [US4] 共有画面の候補に、選択の記録（`sourceKind: DECISION`）と記録項目（`RECORD_ENTRY`）を既定で未選択の状態で追加する（`src/server/domain/consent.ts`, `src/app/(person)/milestones/[id]/share/[relationshipId]/page.tsx`）

---

## Phase 7: User Story 5 - 次の節目で過去の判断から考え始める (Priority: P5)

**Goal**: 関係が終わっても記録が残り、次の節目で前回の判断軸と比べられる

**Independent Test**: quickstart.md シナリオ2

- [ ] T067 [P] [US5] E2E を書く：本人が関係を終了 → 記録が残り CA は閲覧できない → 新しい節目の最初の問いが前回の判断軸にふれる → `/history` に2つの節目が並ぶ（`tests/e2e/us5-next-milestone.spec.ts`）
- [ ] T068 [US5] 関係の終了を作る：`endRelationship`（本人）と `endRelationshipByAgency`（ADMIN）。AgencyRelationship だけを `ENDED` にし、本人の Axis には触れない。`RELATIONSHIP_ENDED` を記録（`src/server/domain/relationship.ts`）
- [ ] T069 [US5] 新しい節目の対話で、本人の過去の `VALUES` / `CRITERIA_VISION` / `REASON` をシステムプロンプトに差し込み、最初の問いを前回との比較にする。**本人自身の記録だけ**を渡す（`src/server/ai/dialogue.ts`, `src/server/ai/prompts/dialogue.ts`）
- [ ] T070 [US5] 履歴画面を作る：節目ごとの価値観・判断軸を時系列で並べて比較（`src/app/(person)/history/page.tsx`）
- [ ] T071 [US5] 共有の管理画面に関係の終了ボタンを追加する（`src/app/(person)/sharing/page.tsx`）

---

## Phase 8: User Story 6 - 共同検証の結果を集計で見る (Priority: P6)

**Goal**: 管理者・運営が件数の集計だけを見られる

**Independent Test**: 1社分のデータで各指標が出て、集計画面から個人の内容に到達できないこと

- [ ] T072 [US6] 集計を作る：利用案内数・対話開始数・完了数・所要時間の中央値・許可数・CA の面談前参照数を期間別に AuditEvent から集計（`STAY` を失敗として扱わない）（`src/server/domain/metrics.ts`）
- [ ] T073 [P] [US6] 紹介会社の集計画面（ADMIN のみ、自社のみ）を作る（`src/app/(agency)/agency/metrics/page.tsx`）
- [ ] T074 [P] [US6] 運営の画面を作る：紹介会社と管理者アカウントの作成、全社の集計（`src/app/(ops)/ops/agencies/page.tsx`, `src/app/(ops)/ops/metrics/page.tsx`）

---

## Phase 9: AWS 本番環境

**Purpose**: plan.md「本番（AWS ap-northeast-1）」の構成をつくり、自動でデプロイする。US1 が終わった時点で着手できる

- [ ] T075 AWS CDK（TypeScript）のプロジェクトを作る（`infra/package.json`, `infra/bin/axis.ts`, `infra/cdk.json`）
- [ ] T076 [P] ネットワークを定義する：VPC（public / private / isolated の各サブネット、2 AZ）、Bedrock・Secrets Manager・ECR・CloudWatch Logs の VPC エンドポイント（`infra/lib/network-stack.ts`）
- [ ] T077 [P] データベースを定義する：RDS PostgreSQL 17（Single-AZ、KMS 暗号化、自動バックアップ7日、isolated サブネット、アプリからだけ接続可）と接続情報の Secrets Manager（`infra/lib/database-stack.ts`）
- [ ] T078 [P] メールを定義する：SES のドメイン認証（DKIM）（`infra/lib/mail-stack.ts`）
- [ ] T079 アプリを定義する：ECR、ECS Fargate サービス（最小1〜最大3タスク）、ALB（ACM・HTTPS のみ）、AWS WAF の基本ルール、Route 53、Bedrock の呼び出し権限、`/api/health` のヘルスチェック、マイグレーション用の単発タスク定義（`infra/lib/app-stack.ts`）
- [ ] T080 [P] 監視を定義する：CloudWatch アラーム（5xx の増加、タスクの停止、RDS の CPU・空き容量）（`infra/lib/monitoring-stack.ts`）
- [ ] T081 CI を作る：PR で lint・typecheck・Vitest（PostgreSQL のサービスコンテナ）・Playwright（AI はモック）を実行（`.github/workflows/ci.yml`）
- [ ] T082 CD を作る：`main` へのマージで、OIDC で AWS に認証 → イメージをビルドして ECR にプッシュ → マイグレーションの単発タスク → ECS のローリング更新（`.github/workflows/deploy.yml`）
- [ ] T083 [P] AI の評価テストを、プロンプト・AI まわりのファイルを変えた PR でだけ実行するワークフローを作る（`.github/workflows/ai-eval.yml`）
- [ ] T084 [P] 初回デプロイと運用の手順を書く（`infra/README.md`）

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T085 [P] 本人の記録の持ち出しを作る：`GET /api/me/export` で `axis.json` と `axis.md` を zip で返し、`AXIS_EXPORTED` を記録（`src/app/api/me/export/route.ts`, `src/server/domain/export.ts`）
- [ ] T086 本人の記録の削除・退会を作る：削除の前に「紹介会社が転記済みの内容はその会社の範囲で扱われる」と表示し、`deleteAxis({ confirm: "DELETE" })` で領域A と本人の SharedSnapshot を削除、AuditEvent の `actorUserId` / `axisId` を消して `AXIS_DELETED` を記録（`src/server/domain/account-deletion.ts`, `src/app/(person)/settings/data/page.tsx`）
- [ ] T087 [P] スマートフォン幅（375px）での表示を全画面で確認・調整する（`src/app/`, `src/components/`）
- [ ] T088 [P] アクセシビリティを確認する（フォームのラベル、キーボード操作、コントラスト）（`src/components/`）
- [ ] T089 [P] README を書く：概要、ローカルでの起動、テスト、ディレクトリ構成、spec-kit の使い方（`README.md`）
- [ ] T090 quickstart.md のシナリオ1〜3と自動テストを通しで実行し、結果を確認する（`specs/001-phase1-career-dialogue/quickstart.md`）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup（Phase 1）**: 依存なし
- **Foundational（Phase 2）**: Setup の後。**すべての Story の前提**
- **US1（Phase 3）**: Foundational の後。ほかの Story に依存しない
- **US2（Phase 4）**: US1 の整理結果（ReflectionVersion）を使う
- **US3（Phase 5）**: US2 のスナップショットを読む。利用案内の送信（T054）は US1 の受け入れ（T038）と組になる
- **US4（Phase 6）**: Foundational の後なら着手できる。T066 だけは US2 の共有画面が必要
- **US5（Phase 7）**: US1 の対話が必要。関係の終了は US3 の確認に使う
- **US6（Phase 8）**: AuditEvent が溜まる US1〜US3 の後
- **AWS 本番（Phase 9）**: US1 の完了後に着手できる。ほかの Story とは並行して進められる
- **Polish（Phase 10）**: 必要な Story がそろった後

### Story の完了順

```text
Setup → Foundational → US1 (MVP) → US2 → US3 → US5 → US6
                          │                  ↑
                          └──── US4 ─────────┘（T066 は US2 の後）
                          └──── AWS 本番（並行）
```

### Parallel Opportunities

- Setup：T003〜T010 は並行できる
- Foundational：T014・T015、T017・T018、T020〜T026、T028・T029、T030 は並行できる（T012・T013 の後）
- US1：T032・T033（テスト）、T034〜T036（プロンプト・安全対応）、T041・T042（画面）は並行できる
- AWS 本番：T076〜T078・T080 は並行できる

## Parallel Example: User Story 1

```bash
# テストとプロンプトを同時に進める
Task: "AI の評価テスト in tests/ai-eval/dialogue.eval.test.ts"
Task: "E2E in tests/e2e/us1-dialogue.spec.ts"
Task: "対話用のシステムプロンプト in src/server/ai/prompts/dialogue.ts"
Task: "整理結果用のプロンプト in src/server/ai/prompts/reflection.ts"
Task: "危険な兆候の判定 in src/server/ai/safety.ts"
```

## Implementation Strategy

### ローカル開発の土台（最初の区切り）

1. Phase 1（Setup）と Phase 2（Foundational）を終える
2. Checkpoint を確認する：Docker Compose で起動、`/api/health` が 200、シードの CA でログイン、`npm test` と `npm run test:contract` が通る

### MVP（User Story 1）

1. Phase 3 を終える
2. 本人だけで対話〜整理結果まで動くことを quickstart.md で確認する
3. Phase 9（AWS 本番）を進め、簡易試作の検証（資料 STEP4）に使う

### その後の積み上げ

US2 → US3 で共同検証（資料 STEP6）に使える状態にし、US4〜US6 は検証の結果を見て優先度を見直す
（Constitution「検証で必要と分かった機能だけを作る」）。
