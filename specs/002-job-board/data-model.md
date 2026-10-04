# Data Model: 求人・求職の掲示板（Axis ボード）

**Date**: 2026-10-04 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

001 の [data-model.md](../001-phase1-career-dialogue/data-model.md) のテーブルはすべて残し、次を追加・変更する。
ID は UUID v7、日時は UTC。`[法]` は法令対応のための項目。

```text
User ─┬─ EmployerProfile ── JobPost ─┬─ JobPostRevision
      │                              └─ Application ──┐
      ├─ SeekerProfile ─── SeekerPost                  │
      ├─ Conversation（求職者 × 企業）── Message ◀──────┘（応募・声かけで会話が始まる）
      ├─ Block / Report ── ReportEvidence / ModerationAction
      ├─ SavedSearch / FeatureEntitlement / Inquiry
      └─ PersonalAxis（001：Axis エンジン）
```

---

## 変更：User

| Field | Type | Notes |
|-------|------|-------|
| kind | enum `PERSON` \| `EMPLOYER` \| `STAFF` | **`EMPLOYER` を追加**。`PERSON` = 求職者。`STAFF` = 運営・001 の紹介会社の所属者 |
| emailVerified | boolean | 既存。false の間は投稿・応募・メッセージ送信ができない（FR-002） |
| failedLoginCount | int | 連続したログイン失敗の回数（FR-004） |
| lockedUntil | datetime? | この時刻までログインできない |
| suspendedAt / suspendedReason | datetime? / string? | 運営による利用停止（FR-035） |
| notifyMessages | boolean = true | 新着メッセージのメール通知（FR-026, FR-043） |
| notifyJobAlerts | boolean = true | 新着求人のメール通知（FR-020） |
| termsVersion / termsAcceptedAt | string / datetime | 同意した利用規約の版と日時（FR-046）[法] |
| ageConfirmedAt | datetime? | 求職者が18歳以上であることを確認した日時（spec の前提） |

- 1つのメールアドレスは1つの `User` だけ（既存の一意制約）。種類は登録時に決まり、変えられない（FR-007）

## EmployerProfile（企業プロフィール）

| Field | Type | Notes |
|-------|------|-------|
| userId | → User（`EMPLOYER`、一意） | |
| companyName | string（1〜100文字） | 求人の「募集する企業の名称」として表示 [法] |
| prefecture | enum（47都道府県） | |
| address | string（最大200文字） | |
| businessDescription | text（最大2000文字） | |
| contactName | string?（最大50文字） | 採用担当者の名前（任意） |
| websiteUrl | string? | |
| corporateNumber | string?（13桁） | 法人番号（任意。将来の存在確認に使う） |

- 企業プロフィールがない企業は求人を作れない（FR-008）

## SeekerProfile（求職者プロフィール）

| Field | Type | Notes |
|-------|------|-------|
| userId | → User（`PERSON`、一意） | |
| displayName | string（1〜30文字） | 必須はこれだけ（FR-021） |
| desiredCategories | enum[]（職種） | 任意 |
| desiredPrefectures | enum[]（都道府県） | 任意 |
| experience | text?（最大2000文字） | |
| qualifications | text?（最大1000文字） | |
| selfIntroduction | text?（最大2000文字） | |

## JobPost（求人）

| Field | Type | Notes |
|-------|------|-------|
| id, employerId | | employerId → User（`EMPLOYER`） |
| status | enum | 状態遷移は下記 |
| title | string（1〜60文字） | |
| category | enum（職種、[compliance-rules.md](./contracts/compliance-rules.md) の一覧） | |
| employmentType | enum `FULL_TIME` \| `CONTRACT` \| `PART_TIME` \| `DISPATCH` | 正社員・契約社員・パート/アルバイト・派遣（FR-010）[法] |
| jobDescription | text（必須、最大3000文字） | 業務内容 [法] |
| jobChangeScope | text（必須、最大500文字） | 業務内容の変更の範囲 [法] |
| contractType | enum `INDEFINITE` \| `FIXED_TERM` | 契約期間の定めの有無 [法] |
| contractTermText | string?（有期なら必須） | 契約期間 [法] |
| renewalPolicy | enum? `RENEWABLE` \| `NOT_RENEWABLE` \| `CONDITIONAL`（有期なら必須） | 更新の有無 [法] |
| renewalCapText | string?（有期なら必須。上限なしなら「なし」） | 更新の上限 [法] |
| trialPeriodText | string（必須。なしなら「なし」） | 試用期間 [法] |
| prefecture / city / addressDetail | enum / string / string? | 就業場所 [法] |
| remoteWork | enum `NONE` \| `PARTIAL` \| `FULL` | |
| locationChangeScope | text（必須、最大500文字） | 就業場所の変更の範囲 [法] |
| workHoursText | text（必須） | 始業・終業時刻（シフト制の説明を含む）[法] |
| overtime | enum `NONE` \| `EXISTS` + overtimeText? | 時間外労働の有無 [法] |
| breakText / holidaysText | text（必須） | 休憩・休日 [法] |
| salaryType | enum `HOURLY` \| `DAILY` \| `MONTHLY` \| `ANNUAL` | [法] |
| salaryMin / salaryMax | int（円）/ int?（円） | min は必須、max は任意（min ≤ max） [法] |
| salaryNote | text?（固定残業代がある場合は必須） | 手当・固定残業代の内訳など [法] |
| fixedOvertimePay | boolean | 固定残業代の有無。true なら salaryNote に時間数と金額を書く [法] |
| insurance | enum[] `EMPLOYMENT` \| `WORKERS_COMP` \| `HEALTH` \| `PENSION` | 加入する保険 [法] |
| smokingMeasure | enum `NO_SMOKING_INDOOR` \| `SMOKING_ROOM` \| `NO_MEASURE` \| `OTHER` + smokingText? | 受動喫煙を防ぐための措置 [法] |
| ageMin / ageMax | int? | 年齢の条件。入れる場合は ageExceptionReason が必須（FR-012）[法] |
| ageExceptionReason | enum? | 法令の例外理由（[compliance-rules.md](./contracts/compliance-rules.md)） [法] |
| complianceConfirmedAt | datetime | 公開時の確認（事実であること・法令違反なし・争議中の事業所でない）（FR-013）[法] |
| version | int | 公開・更新のたびに増える |
| publishedAt | datetime? | 掲載日（最初に公開した日）[法] |
| contentUpdatedAt | datetime? | 最終更新日（労働条件・本文を変えた日）[法] |
| expiresAt | datetime? | 掲載期限（公開・延長の日から最長60日）（FR-014）[法] |
| closedAt | datetime? | 募集終了・期限切れの日時 |
| hiddenAt / hiddenReason | datetime? / string? | 運営による非公開 |

**状態遷移**:

```text
DRAFT ──公開（全必須項目・確認あり）──▶ PUBLISHED ──企業が募集終了──▶ CLOSED
                                         │  ▲
                        掲載期限を過ぎる │  │ 企業が延長（期限を新たに最長60日）
                                         ▼  │
                                       EXPIRED
PUBLISHED ──運営が非公開（修正依頼の期限切れ・悪質）──▶ HIDDEN ──企業が修正し運営が解除──▶ PUBLISHED
```

- 一覧・検索に出るのは `PUBLISHED` かつ `expiresAt > now` のものだけ
- 応募できるのも `PUBLISHED` のものだけ（期限切れ・終了後は「募集は終了しました」）
- 運営は内容を書き換えない（FR-016）。運営ができる状態変更は `HIDDEN` への変更と解除だけ

## JobPostRevision（求人の版）

| Field | Type | Notes |
|-------|------|-------|
| jobPostId, version | | `(jobPostId, version)` で一意 |
| snapshot | json | その版の内容すべて |
| changedFields | string[] | 前の版から変わった項目（労働条件の変更の通知に使う、FR-015）[法] |
| createdAt | datetime | |

## Application（応募）

| Field | Type | Notes |
|-------|------|-------|
| id, jobPostId, seekerId, conversationId | | `(jobPostId, seekerId)` で一意（同じ求人に二重に応募しない） |
| sharedFields | enum[]（プロフィールの項目） | 求職者が共有を選んだ項目（FR-022）（原則IV） |
| sharedProfile | json | 応募した時点で共有した内容のコピー。企業が見るのはこれ（FR-023） |
| jobVersion | int | 応募した時点の求人の版 |
| createdAt | datetime | |

## SeekerPost（求職の投稿）

| Field | Type | Notes |
|-------|------|-------|
| id, seekerId | | 1人が持てる公開中の投稿は3件まで |
| title | string（1〜60文字） | |
| body | text（1〜2000文字） | 連絡先らしき文字列は公開前に注意（FR-033） |
| desiredCategory / desiredPrefecture | enum? | |
| employmentTypes | enum[] | |
| status | enum `PUBLISHED` \| `UNPUBLISHED` \| `HIDDEN` | `HIDDEN` は運営による非公開 |
| publishedAt / updatedAt | datetime | |

- 見られるのは、ログインした `EMPLOYER` だけ（FR-032）

## Conversation（会話）／ Message（メッセージ）

| Entity | Field | Notes |
|--------|-------|-------|
| Conversation | id, seekerId, employerId | `(seekerId, employerId)` で一意。同じ企業との応募・質問・声かけは1つの会話にまとまる |
| | origin `APPLICATION` \| `INQUIRY` \| `EMPLOYER_CONTACT` | 最初のきっかけ |
| | jobPostId? / seekerPostId? | 最初のきっかけになった求人・求職の投稿 |
| | lastMessageAt, seekerLastReadAt, employerLastReadAt | 未読の判定 |
| Message | id, conversationId, senderId?, kind `USER` \| `SYSTEM` | `SYSTEM` は「応募しました」「労働条件が変更されました」などのお知らせ。利用者の本文とは分ける |
| | bodyEncrypted | 暗号化した本文（`v1:` などの鍵の世代を先頭に付ける）（R6）[法] |
| | systemEvent? / systemPayload? | SYSTEM の種類と、表示に必要な ID（本文は持たない） |
| | createdAt | |

- 本文は1件1〜2000文字。添付は持たない（FR-030）
- 会話の当事者以外は、運営を含めて会話・メッセージを読めない（FR-027）[法]
- 退会した利用者のメッセージは残し、表示名を「退会したユーザー」にする（FR-044）

## Block（ブロック）

| Field | Notes |
|-------|-------|
| blockerId, blockedId, createdAt | `(blockerId, blockedId)` で一意。ブロックされた側は送信できない（「送信できません」とだけ表示） |

## Report（通報）／ ReportEvidence ／ ModerationAction

| Entity | Field | Notes |
|--------|-------|-------|
| Report | id, reporterId, targetType `JOB_POST` \| `SEEKER_POST` \| `MESSAGE` \| `USER`, targetId | |
| | reason enum `ILLEGAL` \| `FALSE_INFO` \| `DISCRIMINATION` \| `HARASSMENT` \| `SPAM` \| `SCAM` \| `OTHER`, detail? | |
| | status `OPEN` \| `IN_REVIEW` \| `RESOLVED` \| `DISMISSED` | |
| | receivedAt, firstHandledAt?, resolvedAt?, resolutionNote? | 受付から一次対応までの時間（SC-009） |
| ReportEvidence | reportId, messageId, sentAt, senderRole, bodyPlain | **通報者が選んだメッセージだけ**を、通報者の提出として平文で複製する（R6）[法] |
| ModerationAction | id, operatorId, targetType, targetId, action `REQUEST_FIX` \| `HIDE` \| `UNHIDE` \| `SUSPEND` \| `UNSUSPEND`, reason, fixDeadline?, reportId?, createdAt | 運営の対応の記録（FR-035）[法] |

## Inquiry（お問い合わせ）

| Field | Notes |
|-------|-------|
| id, userId?, email, category `COMPLAINT` \| `QUESTION` \| `OTHER`, body | ログインしていなくても送れる（FR-036）[法] |
| status `OPEN` \| `IN_PROGRESS` \| `CLOSED`, receivedAt, firstHandledAt?, closedAt?, notes json[] | 受付から対応完了までの経過 [法] |

## SavedSearch（保存した検索条件）

| Field | Notes |
|-------|-------|
| id, seekerId, criteria json（キーワード・職種・勤務地・雇用形態・給与の下限）, notify boolean, lastNotifiedAt | 1人10件まで。通知は本人が設定した条件だけで作る（FR-020）[法] |

## FeatureEntitlement（追加機能の利用権）

| Field | Notes |
|-------|-------|
| id, userId, feature enum `AXIS_ENGINE`, startsAt, endsAt?, source `MANUAL` \| `SUBSCRIPTION`, grantedById? | 有効 = `startsAt ≤ now AND (endsAt IS NULL OR endsAt > now)`（FR-041）。期限が切れても Axis の記録は消さない（原則V） |

## AuditEvent（操作履歴）の追加

`type` に次を追加する：`ACCOUNT_CREATED`、`ACCOUNT_LOCKED`、`ACCOUNT_DELETED`、`JOB_PUBLISHED`、`JOB_UPDATED`、`JOB_CLOSED`、`JOB_EXPIRED`、
`APPLICATION_CREATED`、`SEEKER_POST_PUBLISHED`、`SEEKER_POST_UNPUBLISHED`、`REPORT_CREATED`、`MODERATION_ACTION`、`INQUIRY_CREATED`、`ENTITLEMENT_GRANTED`、`RATE_LIMITED`。
`metadata` に本文を入れない原則は 001 のまま。事業概況報告の集計（FR-038）は、これらの件数と各テーブルの件数から作る。

## 検証ルール

詳細は [contracts/compliance-rules.md](./contracts/compliance-rules.md)。主なもの：

| 対象 | ルール | 出典 |
|------|--------|------|
| 求人の公開 | FR-009 の必須項目がすべて埋まり、確認（complianceConfirmedAt）があること | FR-009, FR-013 |
| 求人の本文・条件 | 性別を限定する語句がないこと | FR-011 |
| 年齢の条件 | ageMin/ageMax を入れるなら ageExceptionReason が必須 | FR-012 |
| 給与 | salaryMin > 0、salaryMax があれば salaryMin ≤ salaryMax、固定残業代ありなら salaryNote 必須 | FR-009 |
| パスワード | 8〜128文字、よく使われるパスワードでない | FR-003 |
| メッセージ | 1〜2000文字、ブロックされていない、両者とも停止・退会していない、回数制限内 | FR-024, FR-028, FR-037 |
| 求職の投稿 | 連絡先らしき文字列があれば注意（公開は止めない） | FR-033 |
