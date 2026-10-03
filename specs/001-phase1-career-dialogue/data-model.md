# Data Model: Phase1 本人起点のキャリア対話と許可制共有

**Date**: 2026-10-03 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

PostgreSQL + Prisma を想定する。ID は推測されにくい ID（UUID v7 など）、日時は UTC で保存する。
本仕様のデータは大きく3つの領域に分かれ、**領域をまたぐ読み取りの経路を限定する**ことで
Constitution 原則IV・V を守る。

| 領域 | 持ち主 | 読める人 |
|------|--------|----------|
| A. 本人の Axis | 本人 | 本人のみ |
| B. 共有スナップショット | 本人（許可した時点でコピーされる） | 本人＋許可された紹介会社の担当CA・管理者 |
| C. 紹介会社・運営 | 紹介会社／運営 | 紹介会社の所属者・運営（集計は件数のみ） |

```text
User ─┬─ PersonalAxis ─┬─ Milestone ─┬─ DialogueSession ─ DialogueMessage
      │                │             ├─ ReflectionSummary ─ ReflectionVersion ─ ReflectionSection
      │                │             ├─ RecordEntry
      │                │             └─ DecisionRecord ─ DecisionOption
      │                └─ AgencyRelationship ─ SharingConsent ─ SharedSnapshot ─ SharedSnapshotItem
      ├─ AgencyMember ─ Agency
      └─ AuditEvent（追記のみ）
```

---

## A. 本人の Axis（読めるのは本人だけ）

### User
認証の主体。本人・CA・管理者・運営で共通。

| Field | Type | Notes |
|-------|------|-------|
| id | id | |
| email | string | 一意。ログインに使う |
| displayName | string? | |
| kind | enum `PERSON` \| `STAFF` | `STAFF` は紹介会社の所属者・運営。1つのアカウントが両方を兼ねない |
| isOperator | boolean | Axis 運営チーム |
| createdAt / deletedAt | datetime | 本人が退会した場合は `deletedAt` を入れ、関連データを削除する |

### PersonalAxis
本人の記録全体。User（PERSON）1人につき1つ。**紹介会社への外部キーを持たない**（原則V）。

| Field | Type | Notes |
|-------|------|-------|
| id | id | |
| userId | → User | 一意 |
| createdAt | datetime | |

### Milestone（節目）

| Field | Type | Notes |
|-------|------|-------|
| id | id | |
| axisId | → PersonalAxis | |
| kind | enum `JOB_SEARCH` \| `CAREER_CHANGE` \| `PROMOTION_TRANSFER` \| `RESKILLING` \| `LIFE_EVENT` | FR-012（就職・転職・昇進/異動・学び直し・人生の変化） |
| title | string? | 本人が付ける名前（例：「2026年 2回目の転職」） |
| startedAt | datetime | |

### DialogueSession（対話セッション）

| Field | Type | Notes |
|-------|------|-------|
| id | id | |
| milestoneId | → Milestone | |
| status | enum | 状態遷移は下記 |
| modality | enum `TEXT` \| `VOICE` | Phase1 は `TEXT` のみ（FR-008）。音声は後から追加 |
| startedAt / lastActiveAt / completedAt | datetime? | 所要時間の集計（SC-003）に使う |
| safetyStoppedAt | datetime? | 危険な兆候で対話を止めた時刻（FR-009） |

**状態遷移**:

```text
NOT_STARTED ──開始──▶ IN_PROGRESS ──中断（30分操作なし or 本人が閉じる）──▶ PAUSED
                          ▲                                                │
                          └──────────────────再開──────────────────────────┘
IN_PROGRESS ──4観点がそろい本人が終了──▶ COMPLETED
IN_PROGRESS ──危険な兆候──▶ SAFETY_STOPPED（相談窓口を案内。本人が望めば後日新しいセッションを開始できる）
```

### DialogueMessage

| Field | Type | Notes |
|-------|------|-------|
| id | id | |
| sessionId | → DialogueSession | |
| role | enum `PERSON` \| `AXIS` | |
| kind | enum `ANSWER` \| `QUESTION` \| `MATERIAL` \| `SAFETY` \| `INTRO` | AXIS の応答は `QUESTION` / `MATERIAL` / `SAFETY` / `INTRO` に限る（原則II） |
| content | text | **共有されない。CA 側から読む経路は存在しない**（FR-024） |
| createdAt | datetime | |

### ReflectionSummary / ReflectionVersion / ReflectionSection（整理結果）
対話から作る本人向けのまとめ。修正のたびに新しい版を作り、古い版も残す（FR-016, FR-021）。

| Entity | Field | Type | Notes |
|--------|-------|------|-------|
| ReflectionSummary | id, sessionId（一意）, currentVersionId | | 1セッションにつき1つ |
| ReflectionVersion | id, summaryId, versionNo, createdBy `AI` \| `PERSON`, createdAt | | 版番号は1から順に増える |
| ReflectionSection | id, versionId, aspect, content, isSensitive | | |

- `aspect`: `FEELINGS`（感情・違和感）\| `MOTIVATION`（転職したい理由／実現したい状態）\| `CRITERIA`（判断軸／譲れること・譲れないこと）\| `OPEN_QUESTIONS`（まだ分からないこと／CAと考えたいこと） — FR-003
- `isSensitive`: AI が機微情報（健康・家族など）の可能性を示したもの、または本人が指定したもの。共有の候補では既定で選ばない（FR-023）

### RecordEntry（記録項目）

| Field | Type | Notes |
|-------|------|-------|
| id | id | |
| milestoneId | → Milestone | |
| type | enum | Phase1：`VALUES`（①価値観）\| `CONCERNS`（②悩み・違和感）\| `CRITERIA_VISION`（③判断軸・将来像）\| `OPTIONS_COMPARED`（④比較した選択肢）\| `REASON`（⑤なぜ選んだか）。⑥〜⑧は enum に値を足すだけで追加できる（FR-010） |
| content | text | |
| source | enum `DIALOGUE` \| `PERSON` | AI が対話から作った下書きか、本人が書いたものか |
| sourceSessionId | → DialogueSession? | |
| recordedAt | datetime | 時系列での比較（FR-013）に使う |

### DecisionRecord / DecisionOption（選択記録）

| Entity | Field | Notes |
|--------|-------|-------|
| DecisionRecord | id, milestoneId, decision, reason, decidedAt, outcome? | `decision`: `APPLY` \| `DECLINE` \| `ACCEPT_OFFER` \| `STAY`（今は転職しない）\| `OTHER`。`STAY` を他と同じように扱う（FR-005） |
| DecisionOption | id, decisionId, label, notesByCriteria (json), chosen (bool) | 求人などの選択肢を、本人の判断軸ごとのメモと並べて残す（FR-011） |

---

## B. 共有（許可した時点でコピーする）

### AgencyRelationship（本人と紹介会社の関係）
利用案内から生まれる。**本人の Axis の外側**に置き、関係が終わっても本人の記録には影響しない。

| Field | Type | Notes |
|-------|------|-------|
| id | id | |
| axisId | → PersonalAxis | |
| agencyId | → Agency | |
| assignedCaId | → AgencyMember? | 担当CA（FR-026） |
| invitationId | → Invitation | |
| status | enum `INVITED` \| `ACTIVE` \| `ENDED` | |
| endedAt / endedBy | datetime? / enum `PERSON` \| `AGENCY` | 終了後は共有先からの新たな閲覧を止める（FR-030） |

- `(axisId, agencyId)` で一意。同じ本人が複数の紹介会社と関係を持てる（会社ごとに許可は別。FR-019）

### SharingConsent（共有許可）

| Field | Type | Notes |
|-------|------|-------|
| id | id | |
| relationshipId | → AgencyRelationship | |
| reflectionVersionId | → ReflectionVersion | 許可した版（FR-021） |
| grantedAt | datetime | 本人が確認画面で明示的に許可した時刻（FR-018） |
| revokedAt | datetime? | 取り消し（FR-020） |
| supersededAt | datetime? | 修正版を再許可して置き換えられた時刻 |
| supersedesId | → SharingConsent?（一意） | 新しい許可が、置き換えた古い許可を指す |

**ルール**:
- 1つの関係につき「有効な許可」（`revokedAt IS NULL AND supersededAt IS NULL`）は最大1つ。DB の部分一意インデックスで保証する
- 再許可は「古い許可に `supersededAt` を入れる → 新しい許可を `supersedesId` 付きで作る」の順に、1つのトランザクションで行う
- 許可は本人だけが作れる。作成時に SharedSnapshot を同じトランザクションで作る

### SharedSnapshot / SharedSnapshotItem（共有スナップショット）
**CA が読めるのはこのテーブルだけ**。許可の時点の内容をコピーして保存する（research R6）。

| Entity | Field | Notes |
|--------|-------|-------|
| SharedSnapshot | id, consentId（一意）, createdAt | |
| SharedSnapshotItem | id, snapshotId, sourceKind `REFLECTION_SECTION` \| `RECORD_ENTRY` \| `DECISION`, label, content, order | 本人が選んだ項目だけを保存する。既定では何も選ばない（FR-017） |

**CA が読めるのは、次の条件をすべて満たすときだけ**（`src/server/policy/` で判定し、クエリでも同じ条件を付ける）:
1. 閲覧者が関係先の紹介会社の所属者で、担当CA または 管理者
2. 関係の `status = ACTIVE`
3. 許可の `revokedAt IS NULL AND supersededAt IS NULL`
4. 本人のアカウントが削除されていない

---

## C. 紹介会社・運営

### Agency（人材紹介会社）

| Field | Type | Notes |
|-------|------|-------|
| id | id | |
| name | string | 共有の確認画面に表示する（FR-018） |
| status | enum `PILOT` \| `PAID_PILOT` \| `CONTRACTED` \| `ENDED` | 資料の導入ステップ（共同検証→有償検証→本契約）。Phase1 に課金機能はない |
| createdAt | datetime | |

### AgencyMember

| Field | Type | Notes |
|-------|------|-------|
| id | id | |
| agencyId | → Agency | |
| userId | → User（STAFF） | |
| role | enum `CA` \| `ADMIN` | `ADMIN` はCAマネージャー・管理者。集計と全担当の許可済み要約を見られる |
| active | boolean | |

### Invitation（利用案内）

| Field | Type | Notes |
|-------|------|-------|
| id | id | |
| agencyId | → Agency | |
| createdByMemberId | → AgencyMember | |
| assignedCaId | → AgencyMember? | |
| email | string | 本人のメールアドレス。案内を受け入れた後は保持しない |
| tokenHash | string | 案内リンクのトークン（ハッシュで保存） |
| expiresAt / acceptedAt | datetime | 有効期限は14日 |

### AuditEvent（操作履歴・追記のみ）
FR-022 と集計（FR-029）の元データ。更新・削除をしない。

| Field | Type | Notes |
|-------|------|-------|
| id | id | |
| occurredAt | datetime | |
| actorUserId | → User? | |
| axisId | → PersonalAxis? | 本人が自分の履歴を見るときの絞り込みに使う |
| agencyId | → Agency? | |
| type | enum | `INVITATION_SENT` / `INVITATION_ACCEPTED` / `SESSION_STARTED` / `SESSION_COMPLETED` / `SESSION_SAFETY_STOPPED` / `CONSENT_GRANTED` / `CONSENT_REVOKED` / `CONSENT_SUPERSEDED` / `SNAPSHOT_VIEWED` / `SNAPSHOT_EXPORTED` / `RELATIONSHIP_ENDED` / `AXIS_EXPORTED` / `AXIS_DELETED` |
| metadata | json | **本文は入れない**（ID・件数・版番号のみ） |

- 本人の退会時は `actorUserId` / `axisId` を消して匿名の件数として残す（集計を壊さず、個人を特定できない状態にする）

---

## 検証ルール（Zod で定義し、フォーム・サーバー・テストで共通に使う）

| 対象 | ルール | 出典 |
|------|--------|------|
| AI の応答 | `kind` は `QUESTION` / `MATERIAL` / `SAFETY` のいずれか。判定・推奨の表現は評価テストで検出する | 原則II, FR-004 |
| 共有項目の選択 | 0件では許可できない（「何も共有しない」はそもそも許可しないことで表す） | FR-017 |
| 許可 | 確認画面に表示した版の ID と、送信された版の ID が一致すること（古い画面からの許可を防ぐ） | FR-018, FR-021 |
| 対話のメッセージ | 1件あたり最大 4,000 文字 | 一般的な上限 |
| 利用案内 | 有効期限内かつ未使用であること | |

## 削除・持ち出し

| 操作 | 結果 | 出典 |
|------|------|------|
| 本人が記録を持ち出す | 本人の Axis 全体を JSON と、読みやすい Markdown で出力する | FR-015 |
| 本人が記録（または退会）を削除する | 領域A と、本人の SharedSnapshot を削除する。削除の前に「紹介会社が転記済みの内容はその会社の範囲で扱われる」と表示する | FR-015, FR-032 |
| 紹介会社との関係が終わる | 領域A はそのまま残る。関係を `ENDED` にし、CA からの閲覧を止める | FR-030, SC-007 |
