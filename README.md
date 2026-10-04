# Axis

**気軽に、あかるく、まっすぐ。仕事と人の掲示板。**

仕事をさがす人と、人をさがす企業・お店が、無料で使える求人・求職の掲示板です。
見るだけならログイン不要。登録はメールアドレスとパスワードだけ。応募・質問・声かけは掲示板の中のメッセージでやり取りします。
AI との対話で自分の考えを整理する「Axis エンジン」は、追加機能として使えます。

> 職業安定法の「募集情報等提供事業」として運営し、職業紹介（あっせん）は行いません。
> 法令への対応の方針は [constitution](.specify/memory/constitution.md)（原則VII）と
> [掲載ルール](specs/002-job-board/contracts/compliance-rules.md) を参照してください。

## できること

| 利用者 | できること |
|--------|------------|
| 求職者 | 求人をさがす（ログイン不要）、応募・質問、「探しています」の投稿、企業とのメッセージ、新着求人のメール通知、データの持ち出し |
| 企業 | 求人の投稿（法令で必要な労働条件を5つのステップで入力）、応募・質問への返信、「探しています」の投稿への声かけ |
| 運営 | 通報・お問い合わせへの対応、求人の修正依頼・非公開、アカウントの停止、追加機能の利用権の付与、事業概況報告用の集計 |

運営は利用者のメッセージを読めません（暗号化して保存し、運営の画面にも会話を開く機能はありません）。通報のときに提出されたメッセージだけを確認します。

## 技術構成

- Next.js 16（App Router）+ TypeScript の単一アプリ
- PostgreSQL 17 + Prisma 7（本番は Amazon RDS）
- Better Auth（メールアドレス＋パスワード。多要素認証は将来の追加機能）
- pg-boss（PostgreSQL を使うバックグラウンド処理：メール通知・掲載期限など）
- Tailwind CSS 4 + shadcn/ui、丸ゴシック（Zen Maru Gothic）
- AI（Axis エンジン）：ローカルは OpenRouter、本番は Amazon Bedrock
- 本番：AWS ECS Fargate + RDS + SES（[specs/001 の plan.md](specs/001-phase1-career-dialogue/plan.md) 参照）

## ローカルで動かす

必要なもの：Node.js 24 以上、Docker

```bash
cp .env.example .env.local   # MESSAGE_ENCRYPTION_KEY などを設定（下記）
docker compose up -d         # PostgreSQL と Mailpit
npm install
npm run db:migrate
npm run db:seed              # サンプルの企業・求人・求職者・運営
npm run dev                  # http://localhost:3000
```

`.env.local` で最低限必要な値：

- `MESSAGE_ENCRYPTION_KEY`：`echo "v1:$(openssl rand -base64 32)"` の出力
- `AI_PROVIDER`：`mock`（API キーなし）または `openrouter`（`OPENROUTER_API_KEY` と `AI_MODEL_ID` も設定）

確認メール・パスワードの再設定・新着通知のメールは、実際には送られず Mailpit（http://localhost:8025）に届きます。

### サンプルのアカウント（パスワードは `.env.local` の `SEED_STAFF_PASSWORD`）

| 役割 | メールアドレス |
|------|----------------|
| 企業（ひだまりカフェ） | `cafe@axis.example` |
| 企業（ミライテック株式会社） | `tech@axis.example` |
| 求職者 | `seeker@axis.example` |
| 運営 | `ops@axis.example` |

## テスト

```bash
npm run lint           # Biome
npm run typecheck
npm test               # 単体・結合（掲載ルール、暗号化、求人の状態遷移、応募・メッセージ、通報・運営の対応）
npm run test:contract  # アクセス権の表の全セル
npm run test:e2e       # Playwright（PC とスマートフォンの幅）。npm run db:seed 済みが前提
```

## ディレクトリ

```text
src/app/          画面（(public) (auth) (seeker) (employer) (messages) (ops) (axis)）と API
src/server/       業務ロジック（domain）・法令のルール（compliance）・権限（policy）・暗号化（crypto）・ジョブ（jobs）
src/components/   UI 部品（board：掲示板の部品、layout：ヘッダーなど、ui：shadcn/ui）
prisma/           スキーマ・マイグレーション・シード
tests/            unit / integration / contract / e2e
specs/            spec-kit の仕様・設計・タスク（001：Axis エンジンの原型、002：掲示板）
```

## 開発の進め方（spec-kit）

仕様駆動で進めています。新しい機能は `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement` の順で作ります。
すべての設計は [constitution](.specify/memory/constitution.md) の8つの原則に従います。

## 公開前に必要なこと（開発の外）

- 特定募集情報等提供事業の届出（厚生労働大臣）と、電気通信事業の届出（総務省）
- 利用規約・プライバシーポリシー・掲載ルールの語句の一覧を、専門家（弁護士・社会保険労務士）に確認してもらう
- お問い合わせ窓口の運用（2営業日以内に対応を始める）
