# Implementation Plan: Phase1 本人起点のキャリア対話と許可制共有

**Branch**: `001-phase1-career-dialogue` | **Date**: 2026-10-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-phase1-career-dialogue/spec.md`

**前提条件（指定）**: 本番環境は AWS、検証環境はローカル、実装は Next.js など汎用的でメンテナンスが楽なもの

## Summary

本人が人材紹介会社の案内から Axis に登録し、AI と対話して自分の現状と判断軸を整理する。整理結果を本人が確認・修正し、
項目を選んで許可した分だけが、担当 CA に面談前に届く。本人の記録は紹介会社との関係が終わっても本人に残る。

技術的には、**Next.js（TypeScript）の単一フルスタックアプリ**を、ローカルでは Docker Compose（PostgreSQL・Mailpit）と、
本番では **AWS ECS Fargate + RDS PostgreSQL + Bedrock（Claude）+ SES** で動かす。
共有は「許可した時点の内容をコピーする」方式にし、CA が本人の元の記録を読む経路をデータの持ち方で無くす（[research.md](./research.md) R6）。

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 24 LTS

**Primary Dependencies**: Next.js（App Router、最新の安定版）、React、Prisma、Better Auth、Vercel AI SDK（Bedrock / Anthropic プロバイダー）、Zod、Tailwind CSS + shadcn/ui

**Storage**: PostgreSQL 17（本番：Amazon RDS、ローカル：Docker）。ファイル出力は都度作るため、オブジェクトストレージは Phase1 では使わない

**Testing**: Vitest（単体・結合）、Playwright（E2E）、アクセス権の表の自動テスト、AI の評価テスト

**Target Platform**: 本番：AWS ap-northeast-1（ECS Fargate / Linux コンテナ）。利用者：スマートフォン・PC のブラウザ（最新の Chrome / Safari / Edge）

**Project Type**: Web アプリケーション（フルスタック・単一デプロイ）＋ インフラ定義（AWS CDK）

**Performance Goals**: AI の応答は送信から3秒以内に表示が始まる（ストリーミング）。画面の表示は2秒以内。同時に対話する人は最大50人を想定

**Constraints**: 対話本文をログに出さない。CA は許可されたスナップショットしか読めない。月額のインフラ費用は共同検証の期間中 2万円程度に抑える。外部システムとは CSV・コピーのみで連携する

**Scale/Scope**: 共同検証2社程度 × 各15〜25名 ＋ 簡易試作の5〜10名（合計 100名未満）、CA 数十名。画面は約18（本人10、紹介会社6、運営2）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 判定（設計前） | 判定（設計後） | 設計での担保 |
|------|----------------|----------------|--------------|
| I. 本人主体 | ✅ | ✅ | 本人の Axis（PersonalAxis）は紹介会社への参照を持たない独立したデータ。優先度は本人の体験（US1）から作る |
| II. AIは答えを決めない | ✅ | ✅ | AI の応答を `QUESTION` / `MATERIAL` / `SAFETY` の構造で受け取り検証する。誘導質問の評価テストを CI で実行（[contracts/ai-dialogue.md](./contracts/ai-dialogue.md)） |
| III. 時間軸で蓄積 | ✅ | ✅ | Milestone・RecordEntry・DecisionRecord に時点を持たせ、`/history` で比較。利用頻度は指標にしない（集計は完了率・参照率のみ） |
| IV. 許可制共有 | ✅ | ✅ | 既定は共有なし。許可時にスナップショットを作り、CA はそれだけを読む。アクセス権の表を全セル自動テスト（[contracts/routes.md](./contracts/routes.md)） |
| V. 本人に残る | ✅ | ✅ | 関係の終了は AgencyRelationship だけを変更し、本人の Axis には触れない。本人はいつでも持ち出し・削除できる |
| VI. 利益より原則 | ✅ | ✅ | 課金・紹介会社向けの全文閲覧・既定許可などの機能を作らない。`STAY`（今は転職しない）を他の選択と同等に扱い、集計でも失敗として扱わない |
| プライバシー要件 | ✅ | ✅ | 保存時暗号化（KMS）、非公開サブネット、Secrets Manager、操作履歴（追記のみ）、本文をログに出さない、Bedrock で AWS 内に閉じる |
| 検証駆動の開発 | ✅ | ✅ | 外部連携は CSV・コピーのみ。音声・記録項目⑥〜⑧は後から足せる形にし、今は作らない。User Story の優先度順に作る |

**結果**: 違反なし。Complexity Tracking は不要。

## Project Structure

### Documentation (this feature)

```text
specs/001-phase1-career-dialogue/
├── spec.md              # 要件定義書
├── plan.md              # この設計書
├── research.md          # 技術選定の理由（Phase 0）
├── data-model.md        # データモデル（Phase 1）
├── quickstart.md        # ローカル検証の手順（Phase 1）
├── contracts/           # 画面・サーバー処理・AI 対話の取り決め（Phase 1）
│   ├── routes.md
│   ├── server-interfaces.md
│   └── ai-dialogue.md
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks で作る（このコマンドでは作らない）
```

### Source Code (repository root)

```text
.
├── src/
│   ├── app/
│   │   ├── (person)/            # 本人向け画面（/home, /milestones/..., /sharing, /history, /settings）
│   │   ├── (agency)/agency/     # 紹介会社向け画面
│   │   ├── (ops)/ops/           # 運営向け画面
│   │   ├── invite/[token]/      # 利用案内の受け入れ
│   │   └── api/                 # Route Handlers（対話ストリーミング、CSV、持ち出し、ヘルスチェック、認証）
│   ├── components/              # UI 部品（shadcn/ui を含む）
│   ├── server/
│   │   ├── policy/              # アクセス権の判定（唯一の定義）
│   │   ├── domain/              # 業務ロジック（dialogue, reflection, consent, decision, relationship, metrics）
│   │   ├── ai/                  # LLM 呼び出し・プロンプト・構造化出力・安全対応（プロバイダー切り替え）
│   │   ├── auth/                # Better Auth の設定
│   │   ├── mail/                # SES / SMTP（Mailpit）の切り替え
│   │   ├── audit/               # 操作履歴の記録
│   │   └── db.ts                # Prisma クライアント
│   └── lib/                     # 共通の型・Zod スキーマ
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/
│   ├── unit/
│   ├── integration/             # 実際の PostgreSQL を使う
│   ├── contract/                # アクセス権の表・CSV の列
│   ├── e2e/                     # Playwright
│   └── ai-eval/                 # AI の評価テスト
├── infra/                       # AWS CDK（TypeScript）。独立した package.json を持つ
│   ├── bin/
│   └── lib/                     # network / database / app（ECS・ALB）/ mail / monitoring
├── .github/workflows/           # CI（lint・テスト）と CD（ECR・ECS へのデプロイ）
├── docker-compose.yml           # postgres, mailpit（profile: app でアプリのイメージも起動）
├── Dockerfile                   # Next.js standalone のマルチステージビルド
└── .env.example
```

**Structure Decision**: Next.js の単一プロジェクトをリポジトリの直下に置き、業務ロジックは `src/server/` にまとめる（画面のコンポーネントから DB や LLM を直接呼ばない）。
インフラ定義だけは依存関係が違うため `infra/` に分ける。フロントとバックエンドを分けたり、モノレポのツールを入れたりはしない（research R1）。

## 環境構成

### ローカル（検証環境）

```text
ブラウザ ──▶ Next.js（npm run dev, :3000）
               ├──▶ PostgreSQL（docker compose, :5432）
               ├──▶ Mailpit（docker compose, SMTP :1025 / Web :8025）
               └──▶ AI：mock（既定） / Anthropic API / Bedrock（環境変数で切り替え）
```

### 本番（AWS ap-northeast-1）

```text
利用者 ──▶ Route 53 ──▶ ALB（ACM の証明書・HTTPS のみ・AWS WAF の基本ルール）
                          │  public subnet
                          ▼
                     ECS Fargate（Next.js コンテナ、最小1〜最大3タスク） ── private subnet
                          ├──▶ RDS PostgreSQL（Single-AZ、KMS 暗号化、自動バックアップ7日）── isolated subnet
                          ├──▶ Amazon Bedrock（Claude）  ※ VPC エンドポイント経由
                          ├──▶ Amazon SES（マジックリンク・利用案内のメール）
                          ├──▶ Secrets Manager（DB 接続・認証の鍵）
                          └──▶ CloudWatch Logs / アラーム（本文は出さない）

GitHub Actions ──OIDC──▶ ECR へイメージをプッシュ ──▶ ECS をローリング更新
                         マイグレーションは ECS の単発タスクで実行してからアプリを更新
```

- 共同検証の段階では RDS は Single-AZ で始め、有償検証（資料 STEP9）の前に Multi-AZ への切り替えを判断する
- 本番とは別に、AWS 上のステージング環境は今は作らない（指定どおり、検証はローカルで行う）。必要になったら CDK で同じ構成を複製する

### 環境変数（主なもの）

| 変数 | ローカル | 本番 |
|------|----------|------|
| `DATABASE_URL` | docker の postgres | Secrets Manager |
| `AI_PROVIDER` | `mock` / `anthropic` / `bedrock` | `bedrock` |
| `AI_MODEL_ID` | 任意 | Bedrock の Claude Sonnet 系のモデル ID |
| `MAIL_TRANSPORT` | `smtp`（Mailpit） | `ses` |
| `BETTER_AUTH_SECRET` | `.env.local` | Secrets Manager |
| `APP_URL` | `http://localhost:3000` | 本番のドメイン |

## 実装の順序（User Story の優先度と対応）

| 段階 | 内容 | 対応する Story | 検証での使い道 |
|------|------|----------------|----------------|
| 0 | 土台：リポジトリ、Docker Compose、Prisma、認証、policy、CI、CDK の最小構成 | — | |
| 1 | 対話と整理結果（本人だけで完結） | US1 | 簡易試作の検証（資料 STEP4：求職者5〜10名） |
| 2 | 確認・修正・許可制共有 | US2 | 共有構造への本人・紹介会社の反応（反論⑤） |
| 3 | CA の閲覧・CSV・利用案内 | US3 | 共同検証（資料 STEP6） |
| 4 | 選択の記録 | US4 | 対話と実際の選択の照合 |
| 5 | 履歴と次の節目 | US5 | 「戻ってくる」仮説の観察 |
| 6 | 集計 | US6 | 6つの証拠の判定 |

段階1が終わった時点で、本番環境にデプロイして簡易試作の検証に使えるようにする。

## Complexity Tracking

Constitution Check に違反がないため、記載なし。
