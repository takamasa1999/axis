# Implementation Plan: 求人・求職の掲示板（Axis ボード）

**Branch**: `002-job-board` | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-job-board/spec.md`

## Summary

求職者と企業が無料で使える求人・求職の掲示板を作る。企業は法令で必要な労働条件を案内に沿って入力して求人を即時公開し、
求職者はログインなしで探して、登録後に応募・質問・求職の投稿ができる。両者は掲示板の中で1対1のメッセージを自由にやり取りする。
運営は通報・お問い合わせに対応し、不適切な求人の修正を依頼・非公開にできるが、求人の内容は書き換えず、メッセージも読まない。
001 の AI 対話は Axis エンジン（追加機能）として `/axis` 以下に移し、利用権のある人だけが使える。

技術的には 001 の構成をそのまま使い、次を加える：
- メールアドレス＋パスワードだけの認証（Better Auth、確認メール・再設定・誤入力のロック）
- 法令対応の掲載ルールを1か所に集めたモジュール（`src/server/compliance/`）
- メッセージ本文のアプリ側での暗号化と、運営が会話を読む操作を持たない権限設計
- 差分ポーリングによるメッセージの更新、pg-boss によるメール通知・掲載期限の処理
- 「気軽に、あかるく、まっすぐ」のデザインシステム（黄色・丸ゴシック・太いふち取りと影）

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 24 LTS（001 と同じ）

**Primary Dependencies**: Next.js 16（App Router）、React 19、Prisma 7、Better Auth（emailAndPassword）、Zod 4、Tailwind CSS 4 + shadcn/ui、
lucide-react、**pg-boss**（新規：ジョブ管理）、Vercel AI SDK（Axis エンジンのみ）

**Storage**: PostgreSQL 17（本番 RDS、ローカル Docker）。`pg_trgm` 拡張を有効にする。メッセージ本文は AES-256-GCM で暗号化して保存

**Testing**: Vitest（単体・結合・契約）、Playwright（E2E。スマートフォン幅とPC幅）

**Target Platform**: 本番 AWS ap-northeast-1（ECS Fargate）。利用者はスマートフォン・PC のブラウザ

**Project Type**: Web アプリケーション（フルスタック・単一デプロイ）

**Performance Goals**: 求人一覧・詳細はサーバー描画で2秒以内に表示。メッセージは95%が5秒以内に相手に表示（SC-005）。
検索は公開中の求人1万件で1秒以内

**Constraints**: 運営が会話を読めない（通報の提出物を除く）。運営が求人の内容を書き換えられない。求職者から料金を受け取る処理を持たない。
すべての画面がスマートフォンの幅で横スクロールなしに使える。文字のコントラストは WCAG AA

**Scale/Scope**: 公開後3か月で求人100件・求職者500人（SC-011）。初年度で求人数千件・利用者数万人までを現在の構成で扱う。画面は約35

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 判定（設計前） | 判定（設計後） | 設計での担保 |
|------|----------------|----------------|--------------|
| I. 本人主体 | ✅ | ✅ | 掲示板は求職者が自分で探し、自分で応募・公開を選ぶ形。企業向けの応募者管理の機能は作らない |
| II. AIは答えを決めない | ✅ | ✅ | AI は Axis エンジン（001）だけで使い、001 の仕組み（構造化出力・評価テスト）をそのまま使う。掲示板の基本機能に AI の判定は入れない |
| III. 時間軸で蓄積 | ✅ | ✅ | 001 の記録は Axis エンジンにそのまま残る。応募・やり取りの履歴も本人が持ち出せる（FR-045） |
| IV. 許可制共有 | ✅ | ✅ | 応募時に共有する項目を本人が選び、その時点の内容だけを企業に渡す（`Application.sharedProfile`）。求職の投稿は本人が公開したときだけ、ログインした企業にだけ見える |
| V. 本人に残る | ✅ | ✅ | 利用権が切れても Axis の記録は消さない。退会以外で本人の記録を消さない。持ち出しができる |
| VI. 利益より原則 | ✅ | ✅ | 基本機能はすべて無料（FR-039）。課金の処理はこの機能に含めない。求職者から料金を受け取る処理を作らない（FR-040） |
| VII. 法令遵守 | ✅ | ✅ | 掲載ルールのモジュール（[compliance-rules.md](./contracts/compliance-rules.md)）、並び順は客観的な基準のみ、運営からの推薦・連絡の機能なし、メッセージの暗号化と運営の閲覧不可、通報・お問い合わせの記録、事業概況報告用の集計。職業紹介に当たらないことを PR のチェックリストで確認 |
| VIII. 誰でも始めやすい | ✅ | ✅ | 閲覧はログイン不要、登録はメールアドレスとパスワードだけ、主要な操作は3画面以内、スマートフォン優先、ポップで読みやすいデザインシステム（[design-system.md](./contracts/design-system.md)）。多要素認証は将来の追加機能 |
| プライバシー要件 | ✅ | ✅ | 求職者の情報は応募時の共有分だけを企業に渡す。メッセージは暗号化。運営の操作はすべて記録。退会時の削除・持ち出し |
| 検証駆動の開発 | ✅ | ✅ | 課金・ファイル添付・プッシュ通知・多要素認証は作らない。法令に関わる機能（掲載ルール・メッセージ・運営の対応）は公開前に専門家の確認を受けると明記 |

**結果**: 違反なし。新しい依存（pg-boss）とメッセージの暗号化は原則のための選択で、複雑さの例外には当たらない（理由は research R3・R6）。

## Project Structure

### Documentation (this feature)

```text
specs/002-job-board/
├── spec.md
├── plan.md              # この設計書
├── research.md          # 技術選定（Phase 0）
├── data-model.md        # データモデル（Phase 1）
├── quickstart.md        # ローカル検証の手順（Phase 1）
├── contracts/
│   ├── routes.md              # 画面とアクセス権の表
│   ├── server-interfaces.md   # Server Actions・Route Handlers
│   ├── compliance-rules.md    # 掲載ルール（法令対応）
│   └── design-system.md       # デザインシステム
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks で作る
```

### Source Code (repository root)

001 の構成に、次を追加・変更する（★＝新規、◆＝変更）。

```text
src/
├── app/
│   ├── (public)/★              # ログイン不要：/ , /jobs, /jobs/[id], /companies/[id], /contact, /terms, /privacy, /company, /axis-engine
│   ├── (auth)/◆                # /signup, /login, /forgot-password, /reset-password, /verify-email（メール＋パスワードに置き換え）
│   ├── (seeker)/★              # /me, /me/profile, /me/posts/**, /me/searches, /jobs/[id]/apply
│   ├── (employer)/★            # /employer, /employer/profile, /employer/jobs/**, /seekers/**
│   ├── (messages)/★            # /messages, /messages/[conversationId], /settings
│   ├── (axis)/◆                # 001 の (person) を /axis 以下に移す（利用権が必要）
│   ├── (ops)/◆                 # 002 の運営画面に置き換え
│   ├── (agency)/ , invite/      # 001。ENABLE_AGENCY_PILOT=false のとき 404
│   ├── api/conversations/[id]/messages/★   # メッセージの差分取得
│   ├── sitemap.ts★ / robots.ts★
│   └── globals.css◆            # デザインのトークン
├── components/
│   ├── ui/◆                    # shadcn/ui をデザインシステムに合わせて調整
│   ├── board/★                 # 求人カード、絞り込み、職種チップ、空の状態のイラスト
│   └── layout/★                # ヘッダー、スマートフォンの下部タブ、フッター（規約・お問い合わせ）
├── server/
│   ├── auth/◆                  # emailAndPassword、確認メール、再設定、ロック
│   ├── policy/◆                # 002 のアクセス権の表を追加（board.ts）
│   ├── compliance/★            # 求人の必須項目・性別・年齢・連絡先の検出・変更の範囲
│   ├── crypto/★                # メッセージ本文の暗号化・復号
│   ├── jobs/★                  # pg-boss の設定とジョブ（message-digest, job-expiry, job-alert, job-change-notice, report-sla）
│   ├── domain/★                # account, employer, job-post, application, seeker-post, conversation, report, inquiry, entitlement, metrics
│   └── mail/◆                  # 確認・再設定・新着・修正依頼・ロックのメール文面
├── instrumentation.ts★         # サーバー起動時にジョブのワーカーを起動
└── lib/
    ├── master-data.ts★         # 都道府県・職種・雇用形態・年齢の例外理由などの一覧
    └── common-passwords.ts★    # よく使われるパスワードの一覧
prisma/
├── schema.prisma◆              # data-model.md の追加・変更
├── migrations/★                # 002 のマイグレーション（pg_trgm を含む）
└── seed.ts◆                    # 運営・サンプルの企業・求人・求職者
tests/
├── unit/compliance/★           # 掲載ルール
├── integration/★               # 求人の状態遷移、応募、メッセージ（暗号化・ブロック・回数制限）、通報
├── contract/board-policy.test.ts★
└── e2e/★                       # quickstart のシナリオ1〜4
```

**Structure Decision**: 001 と同じ Next.js の単一プロジェクトのまま、ルートグループで利用者の種類ごとに画面を分ける。
業務ロジックは `src/server/domain/`、法令のルールは `src/server/compliance/` に集め、画面から直接 DB を触らない。

## 001 からの移行

| 対象 | 変更 |
|------|------|
| 認証 | Better Auth の `magicLink`・`twoFactor` プラグインを外し、`emailAndPassword`（登録・確認メール・再設定）にする。`two_factors` テーブルは将来の多要素認証のために残す |
| `UserKind` | `EMPLOYER` を追加。`PERSON` は求職者として使う |
| 本人向けの画面（001） | `/home`・`/milestones/**`・`/sharing` を `/axis` 以下に移し、利用権 `AXIS_ENGINE` を確認する |
| 紹介会社向けの画面（001） | `ENABLE_AGENCY_PILOT`（既定 `false`）で無効にする。データとコードは残す |
| 運営の画面 | 002 の `/ops` に置き換える |
| 001 の検証用データ | ローカルのみのため、002 のシードで作り直してよい（本番データはまだない） |

## 環境構成の追加

| 変数 | ローカル | 本番 | 用途 |
|------|----------|------|------|
| `MESSAGE_ENCRYPTION_KEY` | `.env.local`（32バイトの乱数を base64） | Secrets Manager | メッセージ本文の暗号化（世代を付けて入れ替え可能） |
| `ENABLE_AGENCY_PILOT` | `false` | `false` | 001 の紹介会社向けの画面 |
| `TERMS_VERSION` | `2026-10-draft` | 公開時の版 | 規約の版 |
| `REQUIRE_STAFF_2FA` | 削除 | 削除 | 多要素認証は将来の追加機能のため、いったん外す |

本番の AWS 構成（ECS Fargate・RDS・SES・CloudWatch）は 001 の plan.md のまま。pg-boss は RDS の中にテーブルを作るため、追加のサービスは要らない。

## 公開前に必要なこと（開発の外）

- 特定募集情報等提供事業の届出（厚生労働大臣）と、電気通信事業の届出（総務省）
- 利用規約・プライバシーポリシー・掲載ルールの語句の一覧（[compliance-rules.md](./contracts/compliance-rules.md)）を、専門家（弁護士・社会保険労務士）に確認してもらう
- お問い合わせ窓口の運用（誰が・いつまでに対応するか）を決める（SC-009：2営業日以内）
- 運営者情報ページ（`/company`）に、届出の情報と窓口を載せる

## 実装の順序（User Story の優先度と対応）

| 段階 | 内容 | Story | 区切り |
|------|------|-------|--------|
| 0 | 土台：デザインシステム、レイアウト（ヘッダー・下部タブ）、認証の置き換え、002 のスキーマ、権限の表、掲載ルールのモジュール、ジョブの仕組み | — | |
| 1 | 企業の登録・企業プロフィール・求人の作成と公開・掲載期限 | US1 | 求人が公開できる |
| 2 | トップ・求人一覧・絞り込み・詳細（構造化データ・OGP） | US2 | ログインなしで探せる |
| 3 | 求職者の登録・プロフィール・応募・質問・メッセージ・ブロック・通知・労働条件の変更の通知 | US3 | **ここで最初の公開（MVP）が可能** |
| 4 | 求職の投稿・企業からの声かけ・保存した検索条件と新着通知 | US4 | |
| 5 | 通報・運営の画面・お問い合わせ・集計 | US5 | **一般公開の前に必須** |
| 6 | パスワードの変更・退会・持ち出し・通知設定 | US6 | |
| 7 | Axis エンジンの移設・利用権 | US7 | |

段階3までで「求人を出す → 探す → 応募してやり取りする」が一通り動く。一般公開は段階5（通報・運営の対応）と、上の「公開前に必要なこと」が済んでから。

## Complexity Tracking

Constitution Check に違反がないため、記載なし。
