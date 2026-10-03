# Contract: サーバー処理（Server Actions / Route Handlers）

**Plan**: [../plan.md](../plan.md) | **Data model**: [../data-model.md](../data-model.md)

- 画面からの書き込みは **Server Actions**、ストリーミングとファイル出力は **Route Handlers** で実装する
- 入力はすべて Zod で検証する。失敗時は `{ ok: false, error: { code, message } }` を返す
- すべての処理は最初に `policy` で権限を確認する。権限がない場合は存在を明かさず `NOT_FOUND` を返す
- 共有・許可に関わる処理は AuditEvent を同じトランザクションで記録する

共通の戻り値:

```ts
type Result<T> = { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string } };
type ErrorCode = "UNAUTHENTICATED" | "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "RATE_LIMITED" | "INTERNAL";
```

## 本人（Server Actions）

| Action | 入力 | 出力 | ルール | 対応 |
|--------|------|------|--------|------|
| `acceptInvitation` | `{ token, email }` | マジックリンク送信 | 有効期限内・未使用。初回なら User / PersonalAxis を作り、AgencyRelationship を `ACTIVE` にする | FR-001 |
| `createMilestone` | `{ kind, title? }` | `Milestone` | | FR-012 |
| `startDialogue` | `{ milestoneId }` | `DialogueSession` | 進行中・中断中のセッションがあればそれを返す（再開） | FR-006 |
| `completeDialogue` | `{ sessionId }` | `ReflectionVersion`（v1） | AI が4観点の整理結果を作り、`isSensitive` の候補を付ける | FR-007, FR-023 |
| `saveReflection` | `{ summaryId, baseVersionId, sections[] }` | 新しい `ReflectionVersion` | `baseVersionId` が最新でなければ `CONFLICT` | FR-016 |
| `previewShare` | `{ relationshipId, versionId, items[] }` | 相手に見える内容 | 実際の保存はしない | FR-018 |
| `grantConsent` | `{ relationshipId, versionId, items[] }` | `SharingConsent` | items が0件なら `VALIDATION`。以前の有効な許可に `supersededAt` を入れ、新しい許可を `supersedesId` 付きで作り、スナップショットを作る | FR-017〜021 |
| `revokeConsent` | `{ consentId }` | `SharingConsent` | | FR-020 |
| `endRelationship` | `{ relationshipId }` | | 本人の Axis は変更しない | FR-030 |
| `recordDecision` | `{ milestoneId, decision, reason, options[] }` | `DecisionRecord` | `STAY` も同じ扱い | FR-011 |
| `saveRecordEntry` | `{ milestoneId, type, content }` | `RecordEntry` | | FR-010 |
| `deleteAxis` | `{ confirm: "DELETE" }` | | 削除の前に注意書きを表示済みであること | FR-015, FR-032 |

## 紹介会社（Server Actions）

| Action | 入力 | 出力 | ルール | 対応 |
|--------|------|------|--------|------|
| `sendInvitation` | `{ email, assignedCaId? }` | `Invitation` | SES でメール送信。1社あたり1日100件まで | FR-028 |
| `endRelationshipByAgency` | `{ relationshipId }` | | AD のみ | FR-030 |
| `addMember` / `deactivateMember` | `{ email, role }` / `{ memberId }` | | AD のみ | |

## Route Handlers

### `POST /api/dialogue/[sessionId]/messages` — 対話（ストリーミング）

- 認証: 本人（セッションの持ち主）のみ
- Request: `{ content: string }`（1〜4,000 文字）
- Response: ストリーミング（AI SDK の UI メッセージストリーム形式）。最終メッセージは [ai-dialogue.md](./ai-dialogue.md) の構造
- 制限: 1人あたり1分に20回まで。超えたら `429`
- 危険な兆候を検知した場合: `kind: "SAFETY"` の定型メッセージを返し、セッションを `SAFETY_STOPPED` にする

### `GET /api/agency/relationships/[relationshipId]/snapshot.csv` — 許可済み要約の CSV

- 認証: 担当CA または AD。data-model の「CA が読めるのは…」の条件をすべて満たすこと
- Response: `text/csv; charset=utf-8`（Excel で文字化けしないよう BOM 付き）
- 列: `relationship_id, agency_name, consented_at, version_no, item_label, item_content`
- 記録: `SNAPSHOT_EXPORTED` を AuditEvent に残す
- 条件を満たさない場合: `404`

### `GET /api/me/export` — 本人の記録の持ち出し

- 認証: 本人
- Response: `application/zip`（`axis.json` と `axis.md`）
- 記録: `AXIS_EXPORTED`

### `GET /api/health` — ヘルスチェック

- ALB のヘルスチェック用。DB に接続できれば `200 { status: "ok" }`
