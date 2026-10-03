# Quickstart: ローカル検証と動作確認

**Plan**: [plan.md](./plan.md)

実装後に、ローカル環境で機能が端から端まで動くことを確かめる手順。コマンドは実装（tasks.md）で用意する想定。

## 前提

- Node.js 24 LTS、npm
- Docker（Docker Compose を含む）
- AI を実際に使う場合：Anthropic API キー、または Bedrock を使える AWS 認証情報（なくてもモックで動く）

## セットアップ

```bash
cp .env.example .env.local        # AI_PROVIDER=mock のままでも動く
docker compose up -d              # PostgreSQL と Mailpit が起動する
npm install
npm run db:migrate                # マイグレーションを適用する
npm run db:seed                   # 検証用の紹介会社・CA・管理者・運営を作る
npm run dev                       # http://localhost:3000
```

- 届いたメール（マジックリンク・利用案内）は Mailpit（http://localhost:8025）で確認する
- 検証用アカウントの情報は `prisma/seed.ts` と `.env.example` に記載する

## シナリオ1：本人の対話から CA の閲覧まで（US1〜3）

1. CA でログインし（`/agency/login`）、`/agency/invitations/new` から自分宛てのテスト用メールアドレスに利用案内を送る
2. Mailpit で案内メールを開き、`/invite/[token]` から登録する → マジックリンクでログインする
3. `/home` で「転職」の節目を作り、対話を始める
   - **確認**: 始める前に、目的・所要時間の目安・「答えは本人が決める」・「共有は許可制」が表示される（FR-002）
4. 「転職すべきですか？」と送る
   - **確認**: 是非を判定せず、問いか考える材料が返る（FR-004）
5. 4観点を話して対話を終える → 整理結果が表示される。1か所修正して保存する
6. 共有画面で項目を何も選ばない
   - **確認**: 許可ボタンが押せない（FR-017）
7. 2項目を選び、確認画面で相手に見える内容を確かめてから許可する
8. CA の画面で担当求職者を開く
   - **確認**: 選んだ2項目だけが見え、対話の全文やほかの項目は見えない（FR-024）。CSV を出力できる（FR-027）
9. 本人の画面で整理結果をさらに修正する（再許可はしない）
   - **確認**: CA の画面には前回許可した版のまま表示される（FR-021）
10. 本人が許可を取り消す
    - **確認**: CA の画面には「取り消されました」とだけ表示される（FR-020, FR-025）。`/sharing` に操作履歴が残る（FR-022）

## シナリオ2：関係の終了と次の節目（US5）

1. シナリオ1の続き。本人が `/sharing` から紹介会社との関係を終了する
   - **確認**: 本人の記録はすべて残っている（FR-030, SC-007）。CA は閲覧できない
2. 「昇進/異動」の節目を新しく作って対話を始める
   - **確認**: 最初の問いが、前回の判断軸・理由にふれたものになる（FR-014）
3. `/history` で2つの節目が時系列で並ぶ（FR-013）

## シナリオ3：選択の記録（US4）

1. 節目の `/decisions` で求人2件を判断軸と並べて比較し、「今は転職しない（STAY）」を選んで理由を書く
   - **確認**: 転職を促す表示が出ない（FR-005）。共有画面で、選択の記録は既定で選ばれていない

## 自動テスト

```bash
npm run lint                      # Biome
npm run typecheck
npm test                          # Vitest（単体・結合。PostgreSQL を使う）
npm run test:contract             # アクセス権の表の全セル（contracts/routes.md）
npm run test:e2e                  # Playwright（シナリオ1〜3。AI はモック）
npm run test:ai-eval              # AI の評価テスト（実際のモデルを使う。API キーが必要）
```

**期待する結果**: すべて成功する。特に `test:contract` で「許可していない内容が CA に見える」ケースが1件もないこと（SC-005, SC-006）。

## 本番と同じイメージでの確認

```bash
docker build -t axis-app .
docker compose --profile app up   # ビルドしたイメージを、ローカルの DB・Mailpit につないで起動する
```

- **確認**: http://localhost:3000/api/health が `200 { "status": "ok" }` を返す

## 本番（AWS）へのデプロイ

- `main` ブランチへのマージで GitHub Actions が自動でデプロイする（[plan.md](./plan.md) の「本番環境」参照）
- 初回だけ `infra/` で `npx cdk bootstrap` と `npx cdk deploy` を手動で実行する。手順の詳細は `infra/README.md` にまとめる
