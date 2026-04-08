# 02. データモデル（MongoDB スキーマ）

定義ファイル: `models/index.js`（362行）

---

## モデル一覧

| # | モデル名 | コレクション | 概要 |
|---|---------|------------|------|
| 1 | User | users | ログインアカウント |
| 2 | Employee | employees | 従業員プロフィール |
| 3 | Attendance | attendances | 勤怠打刻データ |
| 4 | ApprovalRequest | approvalrequests | 月次勤怠承認リクエスト |
| 5 | Goal | goals | 目標管理 |
| 6 | LeaveRequest | leaverequests | 休暇申請 |
| 7 | LeaveBalance | leavebalances | 休暇残日数 |
| 8 | PayrollRun | payrollruns | 給与処理バッチ |
| 9 | PayrollSlip | payrollslips | 給与明細 |
| 10 | BoardPost | boardposts | 掲示板投稿 |
| 11 | BoardComment | boardcomments | 掲示板コメント |
| 12 | DailyReport | dailyreports | 日報 |
| 13 | SemiAnnualFeedback | semiannualfeedbacks | 半期評価フィードバック |
| 14 | PretestSubmission | pretestsubmissions | 入社前テスト回答 |
| 15 | CompanyRule | companyrules | 会社規定 |
| 16 | SkillSheet | skillsheets | スキルシート |
| 17 | Notification | notifications | 通知 |

---

## 1. User（ユーザー）

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| username | String | unique, required | ログイン ID |
| password | String | required | bcrypt ハッシュ |
| isAdmin | Boolean | default: false | 管理者フラグ |
| createdAt | Date | — | 作成日時 |

---

## 2. Employee（従業員）

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| userId | ObjectId → User | unique, required | 紐づくユーザー |
| employeeId | String | unique, required | 社員番号 |
| name | String | required | 氏名 |
| department | String | required | 部署 |
| position | String | required | 役職 |
| joinDate | Date | required | 入社日 |
| contact | String | — | 電話番号 |
| email | String | — | メールアドレス |
| photoUrl | String | — | 写真 URL（uploads/） |

---

## 3. Attendance（勤怠）

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| userId | ObjectId → User | required | 対象ユーザー |
| date | Date | required | 日付 |
| checkIn | Date | — | 出勤打刻時刻 |
| checkOut | Date | — | 退勤打刻時刻 |
| lunchStart | Date | — | 昼休憩開始 |
| lunchEnd | Date | — | 昼休憩終了 |
| workingHours | Number | — | 実労働時間（h） |
| totalHours | Number | — | 滞在時間（h） |
| taskDescription | String | — | 業務内容メモ |
| status | enum | — | `正常 / 遅刻 / 早退 / 欠勤` |
| isConfirmed | Boolean | default: false | 管理者承認済み |
| confirmedAt | Date | — | 承認日時 |
| confirmedBy | ObjectId → User | — | 承認者 |
| notes | String | — | 備考 |

---

## 4. ApprovalRequest（月次勤怠承認リクエスト）

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| employeeId | String | required | 社員番号 |
| userId | ObjectId → User | required | 申請者 |
| year | Number | — | 対象年 |
| month | Number | — | 対象月 |
| status | enum | — | `pending / approved / rejected / returned` |
| requestedAt | Date | — | 申請日時 |
| processedAt | Date | — | 処理日時 |
| processedBy | ObjectId → User | — | 処理者 |
| returnReason | String | — | 差し戻し理由 |

---

## 5. Goal（目標）

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| title | String | required | 目標タイトル |
| description | String | — | 説明 |
| ownerId | ObjectId → Employee | — | 所有者 |
| ownerName | String | required | 所有者名（非正規化） |
| createdBy | ObjectId → Employee | — | 作成者 |
| createdByName | String | — | 作成者名 |
| progress | Number | default: 0 | 達成率（%） |
| grade | String | — | 評価グレード |
| deadline | Date | — | 期日 |
| status | enum | — | `draft / pending1 / approved1 / pending2 / approved2 / completed / rejected` |
| currentApprover | ObjectId → Employee | — | 現在の承認者 |
| history | Array | — | `[{action, by, date, comment}]` 操作履歴 |
| goalLevel | enum | — | `低 / 中 / 高` |
| actionPlan | String | — | アクションプラン |

### status 遷移

```
draft → pending1 → approved1 → pending2 → completed
              ↓                      ↓
           rejected               rejected
```

---

## 6. LeaveRequest（休暇申請）

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| userId | ObjectId → User | required | 申請者 |
| employeeId | String | required | 社員番号 |
| name | String | required | 申請者名 |
| department | String | required | 部署 |
| leaveType | enum | — | `有給 / 病欠 / 慶弔 / その他 / 午前休 / 午後休 / 早退` |
| halfDay | enum | — | `AM / PM / null` |
| earlyLeaveTime | String | — | 早退時刻（HH:MM） |
| startDate | Date | required | 開始日 |
| endDate | Date | required | 終了日 |
| days | Number | required | 日数 |
| reason | String | required | 理由 |
| status | enum | — | `pending / approved / rejected / canceled` |
| processedAt | Date | — | 処理日時 |
| processedBy | ObjectId → User | — | 処理者 |
| notes | String | — | 管理者メモ |

---

## 7. LeaveBalance（休暇残日数）

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| employeeId | ObjectId → Employee | unique, required | 対象社員 |
| paid | Number | — | 有給残日数 |
| sick | Number | — | 病欠残日数 |
| special | Number | — | 慶弔残日数 |
| other | Number | — | その他残日数 |
| history | Array | — | `[{grantedBy, leaveType, delta, note, at}]` 付与・消費履歴 |

---

## 8. PayrollRun（給与処理バッチ）

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| periodFrom | Date | — | 対象期間開始 |
| periodTo | Date | — | 対象期間終了 |
| fiscalYear | Number | — | 年度（4月始まり） |
| locked | Boolean | — | ロック済みフラグ |
| createdBy | ObjectId → Employee | — | 作成者 |

---

## 9. PayrollSlip（給与明細）

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| runId | ObjectId → PayrollRun | required | バッチ |
| employeeId | ObjectId → Employee | required | 対象社員 |
| workDays | Number | — | 出勤日数 |
| absentDays | Number | — | 欠勤日数 |
| lateCount | Number | — | 遅刻回数 |
| earlyLeaveCount | Number | — | 早退回数 |
| overtimeHours | Number | — | 残業時間 |
| nightHours | Number | — | 深夜時間 |
| holidayHours | Number | — | 休日時間 |
| holidayNightHours | Number | — | 休日深夜時間 |
| baseSalary | Number | — | 基本給 |
| gross | Number | — | 総支給額 |
| net | Number | — | 手取り |
| allowances | Array | — | `[{name, amount}]` 手当一覧 |
| deductions | Array | — | `[{name, amount}]` 控除一覧 |
| commute | Object | — | `{nonTax, tax}` 通勤費（非課税/課税） |
| incomeTax | Number | — | 所得税 |
| status | enum | — | `draft / issued / locked / paid` |
| notes | String | — | 備考 |

---

## 10. BoardPost（掲示板投稿）

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| title | String | required | タイトル |
| content | String | required | 本文 |
| tags | [String] | — | タグ |
| attachments | Array | — | `[{name, url}]` 添付ファイル |
| pinned | Boolean | default: false | ピン留め |
| authorId | ObjectId → User | required | 投稿者 |
| views | Number | — | 閲覧数 |
| likes | Number | — | いいね数 |
| createdAt / updatedAt | Date | — | タイムスタンプ |

---

## 11. BoardComment（掲示板コメント）

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| postId | ObjectId → BoardPost | required | 対象投稿 |
| authorId | ObjectId → User | required | 投稿者 |
| content | String | required | 本文 |
| createdAt | Date | — | 作成日時 |

---

## 12. DailyReport（日報）

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| employeeId | ObjectId → Employee | required | 対象社員 |
| userId | ObjectId → User | required | 対象ユーザー |
| reportDate | Date | required | 日報日付 |
| content | String | required | 本文 |
| achievements | String | — | 本日の成果 |
| issues | String | — | 課題・問題点 |
| tomorrow | String | — | 明日の予定 |
| comments | Array | — | `[{authorId, authorName, text, at, reactions[]}]` コメント一覧 |
| reactions | Array | — | `[{emoji, userId, userName}]` スタンプリアクション |

### 日報スタンプ一覧

| key | emoji | ラベル |
|-----|-------|--------|
| like | 👍 | いいね |
| great | ✨ | すごい |
| nice | 😊 | ナイス |
| hard | 💪 | お疲れ様 |
| check | ✅ | 確認済み |

---

## 13. SemiAnnualFeedback（半期評価フィードバック）

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| userId | ObjectId → User | required | 対象ユーザー |
| employeeId | ObjectId → Employee | — | 対象社員 |
| predictedGrade | String | — | AI予測グレード |
| predictedScore | Number | — | AI予測スコア |
| agree | Boolean | — | 評価への同意フラグ |
| comment | String | — | コメント |
| createdAt | Date | — | 作成日時 |

---

## 14. PretestSubmission（入社前テスト回答）

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| name | String | — | 受験者名 |
| email | String | — | メールアドレス |
| answers | Object | — | 回答データ（q1〜q40） |
| score | Number | — | スコア（/40） |
| total | Number | — | 満点（40） |
| lang | String | — | 言語選択（java / python） |
| perQuestionScores | Object | — | 問題別スコア |
| startedAt / endedAt | Date | — | 開始・終了時刻 |
| durationSeconds | Number | — | 所要時間（秒） |

---

## 15. CompanyRule（会社規定）

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| category | String | required | カテゴリ（例: 就業規則） |
| title | String | required | タイトル |
| content | String | — | 本文（Markdown 対応） |
| order | Number | — | 表示順 |
| updatedBy | ObjectId → User | — | 最終更新者 |
| attachments | Array | — | `[{originalName, filename, mimetype, size}]` |

---

## 16. SkillSheet（スキルシート）

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| employeeId | ObjectId → Employee | unique, required | 対象社員 |
| userId | ObjectId → User | required | 対象ユーザー |
| nameKana | String | — | 氏名（カナ） |
| birthDate | String | — | 生年月日 |
| gender | String | — | 性別 |
| nearestStation | String | — | 最寄り駅 |
| experience | Number | — | IT 経験年数 |
| selfPR | String | — | 自己PR |
| certifications | Array | — | `[{name, acquiredDate}]` 資格一覧 |
| skills.languages | Array | — | `[{name, level}]` プログラミング言語（★1〜5） |
| skills.frameworks | Array | — | `[{name, level}]` FW・ライブラリ |
| skills.databases | Array | — | `[{name, level}]` データベース |
| skills.infra | Array | — | `[{name, level}]` インフラ・クラウド |
| skills.tools | Array | — | `[{name, level}]` ツール |
| projects | Array | — | `[{periodFrom, periodTo, projectName, client, industry, team, role, description, techStack, tasks}]` |

---

## 17. Notification（通知）

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| userId | ObjectId → User | required | 受信者 |
| type | String | required | 通知種別 |
| title | String | required | タイトル |
| body | String | — | 本文 |
| link | String | — | クリック先 URL |
| isRead | Boolean | default: false | 既読フラグ |
| fromUserId | ObjectId → User | — | 送信者（システム通知は null） |
| fromName | String | — | 送信者名 |
| meta | Mixed | — | 追加データ |
| createdAt / updatedAt | Date | — | タイムスタンプ |
