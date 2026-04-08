# DXPRO 勤怠管理システム — システム設計書

> 作成日: 2026-04-09  
> バージョン: 1.0  
> リポジトリ: `DXPRO-SOL/dxpro-attendance`

> **📁 機能別の詳細設計書は [`docs/`](./docs/README.md) フォルダに分割されています。**

---

## 目次

1. [システム概要](#1-システム概要)
2. [技術スタック](#2-技術スタック)
3. [ディレクトリ構成](#3-ディレクトリ構成)
4. [データモデル（MongoDB スキーマ）](#4-データモデルmongodb-スキーマ)
5. [ミドルウェア](#5-ミドルウェア)
6. [ライブラリ・ユーティリティ](#6-ライブラリユーティリティ)
7. [ルート一覧（機能別）](#7-ルート一覧機能別)
   - 7.1 [認証 (auth.js)](#71-認証-authjs)
   - 7.2 [勤怠 (attendance.js)](#72-勤怠-attendancejs)
   - 7.3 [ダッシュボード (dashboard.js)](#73-ダッシュボード-dashboardjs)
   - 7.4 [管理者 (admin.js)](#74-管理者-adminjs)
   - 7.5 [人事・給与・日報 (hr.js)](#75-人事給与日報-hrjs)
   - 7.6 [休暇申請 (leave.js)](#76-休暇申請-leavejs)
   - 7.7 [目標管理 (goals.js)](#77-目標管理-goalsjs)
   - 7.8 [掲示板 (board.js)](#78-掲示板-boardjs)
   - 7.9 [入社前テスト (pretest.js)](#79-入社前テスト-pretestjs)
   - 7.10 [会社規定 (rules.js)](#710-会社規定-rulesjs)
   - 7.11 [スキルシート (skillsheet.js)](#711-スキルシート-skillsheetjs)
   - 7.12 [AIチャットボット (chatbot.js)](#712-aiチャットボット-chatbotjs)
   - 7.13 [通知 (notifications.js)](#713-通知-notificationsjs)
8. [通知システム](#8-通知システム)
9. [スケジューラー](#9-スケジューラー)
10. [メール送信](#10-メール送信)
11. [AI・スコアリングエンジン](#11-aiscoring-エンジン)
12. [ページレンダリング (renderPage.js)](#12-ページレンダリング-renderpagejs)
13. [権限モデル](#13-権限モデル)
14. [セッション管理](#14-セッション管理)
15. [ファイルアップロード](#15-ファイルアップロード)
16. [通知トリガー一覧](#16-通知トリガー一覧)
17. [画面遷移フロー](#17-画面遷移フロー)

---

## 1. システム概要

DXPRO 勤怠管理システムは、中小企業向けのオールインワン HR プラットフォームです。

| 機能カテゴリ | 概要 |
|------------|------|
| 勤怠管理 | 出退勤打刻・月次集計・承認ワークフロー |
| 目標管理 | 個人目標の設定・2段階承認・評価入力 |
| 給与管理 | 給与明細の発行・閲覧・PDF エクスポート |
| 休暇申請 | 各種休暇の申請・承認・残日数管理 |
| 人事管理 | 社員情報の登録・編集・写真管理 |
| 日報 | 日報投稿・コメント・スタンプリアクション |
| 半期評価 | AI による自動グレード計算・改善提案 |
| スキルシート | スキル・職務経歴の登録・Excel エクスポート |
| 掲示板 | 社内お知らせ・ピン留め・いいね・コメント |
| 会社規定 | 規定文書の管理・添付ファイルダウンロード |
| 入社前テスト | 採用前の技術試験（言語選択式 40問） |
| AIチャットボット | 自然言語で勤怠・目標・評価などを照会 |
| 通知 | リアルタイム通知 + スケジュール自動通知 |

---

## 2. 技術スタック

| 区分 | 内容 |
|------|------|
| **ランタイム** | Node.js |
| **Webフレームワーク** | Express.js v5 |
| **データベース** | MongoDB Atlas（Mongoose v8） |
| **セッション** | express-session（メモリストア） |
| **認証** | bcryptjs（パスワードハッシュ） |
| **テンプレート** | サーバーサイドテンプレートリテラル（renderPage.js） |
| **メール** | Nodemailer + SendGrid / Brevo SMTP |
| **スケジューラー** | node-cron v4 |
| **PDF生成** | html-pdf |
| **Excel出力** | ExcelJS |
| **ファイルアップロード** | Multer v2 |
| **日付処理** | moment-timezone |
| **Markdown変換** | marked + sanitize-html |
| **フロントエンドUI** | FontAwesome 6、Bootstrap 5（CDN）、Chart.js 4 |
| **デプロイポート** | 3000 |

---

## 3. ディレクトリ構成

```
dxpro-attendance/
├── server.js                    # エントリーポイント
├── package.json
├── .env                         # 環境変数（Git 除外）
├── config/
│   ├── db.js                    # MongoDB 接続
│   └── mailer.js                # メール送信設定（SendGrid / Brevo / SMTP）
├── middleware/
│   └── auth.js                  # requireLogin / isAdmin ミドルウェア
├── models/
│   └── index.js                 # 全 Mongoose スキーマ・モデル定義
├── lib/
│   ├── helpers.js               # ユーティリティ関数・AI計算エンジン
│   ├── renderPage.js            # HTML ページ生成（共通レイアウト）
│   └── notificationScheduler.js # cron スケジューラー
├── routes/
│   ├── auth.js                  # 認証・ユーザー登録
│   ├── attendance.js            # 勤怠打刻・集計・承認申請
│   ├── dashboard.js             # ダッシュボード・半期評価
│   ├── admin.js                 # 管理者機能
│   ├── hr.js                    # 人事・給与・日報
│   ├── leave.js                 # 休暇申請・承認
│   ├── goals.js                 # 目標管理
│   ├── board.js                 # 掲示板
│   ├── pretest.js               # 入社前テスト
│   ├── rules.js                 # 会社規定
│   ├── skillsheet.js            # スキルシート
│   ├── chatbot.js               # AIチャットボット
│   └── notifications.js         # 通知
├── public/
│   ├── dxpro-logo.png
│   ├── dxpro-solutions-logo.png
│   ├── inkan.png
│   └── nokori-logo.png
└── uploads/
    ├── (社員写真)
    └── rules/
        └── (規定添付ファイル)
```

---

## 4. データモデル（MongoDB スキーマ）

### 4.1 User（ユーザー）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| username | String（unique, required） | ログイン ID |
| password | String（required） | bcrypt ハッシュ |
| isAdmin | Boolean（default: false） | 管理者フラグ |
| createdAt | Date | 作成日時 |

---

### 4.2 Employee（従業員）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| userId | ObjectId → User（unique, required） | 紐づくユーザー |
| employeeId | String（unique, required） | 社員番号 |
| name | String（required） | 氏名 |
| department | String（required） | 部署 |
| position | String（required） | 役職 |
| joinDate | Date（required） | 入社日 |
| contact | String | 電話番号 |
| email | String | メールアドレス |

---

### 4.3 Attendance（勤怠）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| userId | ObjectId → User | 対象ユーザー |
| date | Date（required） | 日付 |
| checkIn | Date | 出勤打刻時刻 |
| checkOut | Date | 退勤打刻時刻 |
| lunchStart | Date | 昼休憩開始 |
| lunchEnd | Date | 昼休憩終了 |
| workingHours | Number | 実労働時間（h） |
| totalHours | Number | 滞在時間（h） |
| taskDescription | String | 業務内容メモ |
| status | enum: `正常 / 遅刻 / 早退 / 欠勤` | 勤怠ステータス |
| isConfirmed | Boolean（default: false） | 管理者承認済み |
| confirmedAt | Date | 承認日時 |
| confirmedBy | ObjectId → User | 承認者 |
| notes | String | 備考 |

---

### 4.4 PayrollRun（給与処理バッチ）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| periodFrom | Date | 対象期間開始 |
| periodTo | Date | 対象期間終了 |
| fiscalYear | Number | 年度（4月始まり） |
| locked | Boolean | ロック済みフラグ |
| createdBy | ObjectId → Employee | 作成者 |

---

### 4.5 PayrollSlip（給与明細）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| runId | ObjectId → PayrollRun（required） | バッチ |
| employeeId | ObjectId → Employee（required） | 対象社員 |
| workDays | Number | 出勤日数 |
| absentDays | Number | 欠勤日数 |
| lateCount | Number | 遅刻回数 |
| earlyLeaveCount | Number | 早退回数 |
| overtimeHours | Number | 残業時間 |
| nightHours | Number | 深夜時間 |
| holidayHours | Number | 休日時間 |
| holidayNightHours | Number | 休日深夜時間 |
| baseSalary | Number | 基本給 |
| gross | Number | 総支給額 |
| net | Number | 手取り |
| allowances | `[{name, amount}]` | 手当一覧 |
| deductions | `[{name, amount}]` | 控除一覧 |
| commute | `{nonTax, tax}` | 通勤費（非課税/課税） |
| incomeTax | Number | 所得税 |
| status | enum: `draft / issued / locked / paid` | 発行ステータス |
| notes | String | 備考 |

---

### 4.6 ApprovalRequest（勤怠承認リクエスト）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| employeeId | String（required） | 社員番号 |
| userId | ObjectId → User（required） | 申請者 |
| year | Number | 対象年 |
| month | Number | 対象月 |
| status | enum: `pending / approved / rejected / returned` | ステータス |
| requestedAt | Date | 申請日時 |
| processedAt | Date | 処理日時 |
| processedBy | ObjectId → User | 処理者 |
| returnReason | String | 差し戻し理由 |

---

### 4.7 Goal（目標）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| title | String（required） | 目標タイトル |
| description | String | 説明 |
| ownerId | ObjectId → Employee | 所有者 |
| ownerName | String（required） | 所有者名（非正規化） |
| createdBy | ObjectId → Employee | 作成者 |
| createdByName | String | 作成者名 |
| progress | Number（default: 0） | 達成率（%） |
| grade | String | 評価グレード |
| deadline | Date | 期日 |
| status | enum: `draft / pending1 / approved1 / pending2 / approved2 / completed / rejected` | ワークフロー状態 |
| currentApprover | ObjectId → Employee | 現在の承認者 |
| history | `[{action, by, date, comment}]` | 操作履歴 |
| goalLevel | enum: `低 / 中 / 高` | 難易度 |
| actionPlan | String | アクションプラン |

**status 遷移図:**

```
draft → pending1 → approved1 → pending2 → completed
            ↓                      ↓
         rejected               rejected
```

---

### 4.8 LeaveRequest（休暇申請）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| userId | ObjectId → User（required） | 申請者 |
| employeeId | String（required） | 社員番号 |
| name | String（required） | 申請者名 |
| department | String（required） | 部署 |
| leaveType | enum: `有給 / 病欠 / 慶弔 / その他 / 午前休 / 午後休 / 早退` | 休暇種別 |
| halfDay | enum: `AM / PM / null` | 午前/午後休フラグ |
| earlyLeaveTime | String | 早退時刻（HH:MM） |
| startDate | Date（required） | 開始日 |
| endDate | Date（required） | 終了日 |
| days | Number（required） | 日数 |
| reason | String（required） | 理由 |
| status | enum: `pending / approved / rejected / canceled` | ステータス |
| processedAt | Date | 処理日時 |
| processedBy | ObjectId → User | 処理者 |
| notes | String | 管理者メモ |

---

### 4.9 LeaveBalance（休暇残日数）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| employeeId | ObjectId → Employee（unique, required） | 対象社員 |
| paid | Number | 有給残日数 |
| sick | Number | 病欠残日数 |
| special | Number | 慶弔残日数 |
| other | Number | その他残日数 |
| history | `[{grantedBy, leaveType, delta, note, at}]` | 付与・消費履歴 |

---

### 4.10 SemiAnnualFeedback（半期評価フィードバック）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| userId | ObjectId → User（required） | 対象ユーザー |
| employeeId | ObjectId → Employee | 対象社員 |
| predictedGrade | String | AI予測グレード |
| predictedScore | Number | AI予測スコア |
| agree | Boolean | 評価への同意 |
| comment | String | コメント |
| createdAt | Date | 作成日時 |

---

### 4.11 PretestSubmission（入社前テスト）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| name | String | 受験者名 |
| email | String | メールアドレス |
| answers | Object | 回答データ（q1〜q40） |
| score | Number | スコア（/40） |
| total | Number | 満点（40） |
| lang | String | 言語選択（java / python / common） |
| perQuestionScores | Object | 問題別スコア |
| startedAt / endedAt | Date | 開始・終了時刻 |
| durationSeconds | Number | 所要時間（秒） |

---

### 4.12 BoardPost（掲示板投稿）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| title | String（required） | タイトル |
| content | String（required） | 本文 |
| tags | [String] | タグ |
| attachments | `[{name, url}]` | 添付ファイル |
| pinned | Boolean（default: false） | ピン留め |
| authorId | ObjectId → User（required） | 投稿者 |
| views | Number | 閲覧数 |
| likes | Number | いいね数 |
| createdAt / updatedAt | Date | タイムスタンプ |

---

### 4.13 BoardComment（掲示板コメント）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| postId | ObjectId → BoardPost（required） | 対象投稿 |
| authorId | ObjectId → User（required） | 投稿者 |
| content | String（required） | 本文 |
| createdAt | Date | 作成日時 |

---

### 4.14 DailyReport（日報）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| employeeId | ObjectId → Employee（required） | 対象社員 |
| userId | ObjectId → User（required） | 対象ユーザー |
| reportDate | Date（required） | 日報日付 |
| content | String（required） | 本文 |
| achievements | String | 本日の成果 |
| issues | String | 課題・問題点 |
| tomorrow | String | 明日の予定 |
| comments | `[{authorId, authorName, text, at, reactions}]` | コメント一覧 |
| reactions | `[{emoji, userId, userName}]` | スタンプリアクション一覧 |

**日報スタンプ一覧:**

| key | emoji | ラベル |
|-----|-------|--------|
| like | 👍 | いいね |
| great | ✨ | すごい |
| nice | 😊 | ナイス |
| hard | 💪 | お疲れ様 |
| check | ✅ | 確認済み |

---

### 4.15 CompanyRule（会社規定）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| category | String（required） | カテゴリ（例: 就業規則） |
| title | String（required） | タイトル |
| content | String | 本文（Markdown 対応） |
| order | Number | 表示順 |
| updatedBy | ObjectId → User | 最終更新者 |
| attachments | `[{originalName, filename, mimetype, size}]` | 添付ファイル |

---

### 4.16 SkillSheet（スキルシート）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| employeeId | ObjectId → Employee（unique, required） | 対象社員 |
| userId | ObjectId → User（required） | 対象ユーザー |
| nameKana | String | 氏名（カナ） |
| birthDate | String | 生年月日 |
| gender | String | 性別 |
| nearestStation | String | 最寄り駅 |
| experience | Number | IT 経験年数 |
| selfPR | String | 自己PR |
| certifications | `[{name, acquiredDate}]` | 資格一覧 |
| skills.languages | `[{name, level}]` | プログラミング言語（★1〜5） |
| skills.frameworks | `[{name, level}]` | FW/ライブラリ |
| skills.databases | `[{name, level}]` | データベース |
| skills.infra | `[{name, level}]` | インフラ/クラウド |
| skills.tools | `[{name, level}]` | ツール |
| projects | `[{periodFrom, periodTo, projectName, client, industry, team, role, description, techStack, tasks}]` | 職務経歴 |

---

### 4.17 Notification（通知）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| userId | ObjectId → User（required） | 受信者 |
| type | String（required） | 通知種別（後述） |
| title | String（required） | タイトル |
| body | String | 本文 |
| link | String | クリック先 URL |
| isRead | Boolean（default: false） | 既読フラグ |
| fromUserId | ObjectId → User | 送信者（システム通知は null） |
| fromName | String | 送信者名 |
| meta | Mixed | 追加データ |
| createdAt / updatedAt | Date | タイムスタンプ |

---

## 5. ミドルウェア

### middleware/auth.js

| 関数 | 説明 |
|------|------|
| `requireLogin(req, res, next)` | `req.session.userId` が未設定なら `/login` へリダイレクト |
| `isAdmin(req, res, next)` | `req.session.isAdmin` が false なら 403 エラー |

---

## 6. ライブラリ・ユーティリティ

### 6.1 lib/helpers.js

| 関数 | 引数 | 返り値 | 説明 |
|------|------|--------|------|
| `escapeHtml(str)` | 文字列 | エスケープ済み文字列 | XSS対策 HTML エスケープ |
| `stripHtmlTags(str)` | 文字列 | プレーンテキスト | HTML タグ除去（sanitize-html 使用） |
| `renderMarkdownToHtml(md)` | Markdown 文字列 | サニタイズ済み HTML | Markdown → HTML 変換 |
| `getErrorMessageJP(errorCode)` | エラーコード文字列 | 日本語エラーメッセージ | 認証エラー日本語化 |
| `getPasswordErrorMessage(errorCode)` | エラーコード文字列 | 日本語エラーメッセージ | パスワードエラー日本語化 |
| `computeAIRecommendations(params)` | 各種集計データ | recommendations 配列（最大6件） | ダッシュボード AI インサイト生成 |
| `computePretestScore(answers, lang)` | 回答オブジェクト, 言語 | `{score, total, perQuestionScores}` | 入社前テスト採点 |
| `computeSemiAnnualGrade(userId, employee)` | userId, Employee | `{grade, score, breakdown, actions, explanation}` | 半期評価グレード計算（async） |

#### computeAIRecommendations — 分析ロジック

| # | 分析内容 | 判定条件 | タグ |
|---|---------|---------|------|
| 1 | 残業アラート | 今月残業 ≥ 20h → 月末予測計算 | danger / warn / success |
| 2 | 出勤トレンド | 過去6か月の出勤日数傾向（3ヶ月移動平均） | warn / success |
| 3 | 遅刻・早退異常検知 | 発生率 ≥ 30% かつ 件数 ≥ 3 | danger / warn |
| 4 | 打刻漏れ検知 | 未登録平日 > 5日 | warn / info |
| 5 | 目標達成予測 | 経過率 vs 達成率のギャップ分析 | danger / warn / success |
| 6 | 休暇利用分析 | 承認待ち件数 / 今後の予定休 | info |
| 7 | 給与処理アラート | 未確定給与スリップあり | warn |
| 8 | 半期評価グレード改善ヒント | 複数の弱点項目が重なる場合 | purple |
| 9 | スキルアップ推奨 | 目標達成率 < 70% | info |

#### computeSemiAnnualGrade — スコア計算（100点満点）

| カテゴリ | 配点 | サブ項目 |
|---------|------|---------|
| 出勤 | 30点 | 時間厳守(10) + 安定性(10) + 一貫性(10) |
| 目標 | 30点 | 進捗率(12) + 完了率(12) + 計画性(6) |
| 休暇 | 10点 | 管理(5) + 計画性(5) |
| 残業 | 10点 | コントロール(5) + バランス(5) |
| 給与 | 20点 | 正確性(10) + 適時性(10) |

| スコア | グレード |
|-------|---------|
| 88点以上 | S |
| 75〜87点 | A |
| 60〜74点 | B |
| 45〜59点 | C |
| 44点以下 | D |

---

### 6.2 lib/renderPage.js

| 関数 | 説明 |
|------|------|
| `renderPage(req, res, title, mainTitle, descriptionHtml)` | 全ルートで使用するメインレンダラー。サイドバー・ヘッダー・通知ベル・チャットボットを含む共通レイアウトで HTML を生成し res.send() する |
| `buildPageShell(req, options)` | 旧スタイルルート用。HTML ヘッダー・ナビ部分のシェルを文字列で返す |
| `pageFooter()` | `</div></div>` + チャットボットウィジェット + `</body></html>` を返す |

**renderPage が生成する共通 UI 要素:**

- サイドバー（メニュー、管理者メニュー折りたたみ、教育サブメニュー）
- トップバー（ページタイトル、日時時計、管理者バッジ、通知ベル）
- 通知ドロップダウン（ベルアイコンクリックで展開）
- AI チャットボットウィジェット（右下 FAB ボタン）
- 時計・通知・サイドバートグルの JavaScript

---

## 7. ルート一覧（機能別）

### 7.1 認証 (auth.js)

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | `/` | requireLogin | ルートリダイレクト（`/dashboard` へ） |
| GET | `/login` | なし | ログイン画面 |
| POST | `/login` | なし | ログイン処理。session に `userId / username / isAdmin / employee` をセット |
| GET | `/logout` | なし | セッション破棄 → `/login` リダイレクト |
| GET | `/register` | なし | ユーザー登録画面 |
| POST | `/register` | なし | ユーザー登録処理（bcrypt ハッシュ化） |
| GET | `/change-password` | requireLogin | パスワード変更画面 |
| POST | `/change-password` | requireLogin | パスワード変更処理（現パスワード確認 → 再ハッシュ化） |

---

### 7.2 勤怠 (attendance.js)

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | `/attendance-main` | requireLogin | 勤怠メイン画面（今月カレンダー・サマリー・今日の打刻状態） |
| POST | `/checkin` | requireLogin | 出勤打刻。既に出勤済みなら 400 |
| POST | `/start-lunch` | requireLogin | 昼休憩開始打刻 |
| POST | `/end-lunch` | requireLogin | 昼休憩終了打刻 |
| POST | `/checkout` | requireLogin | 退勤打刻。勤務時間・総時間・ステータス自動計算 |
| POST | `/save-attendance` | requireLogin | 勤怠フォーム保存（日付・時刻・業務内容一括） |
| GET | `/add-attendance` | requireLogin | 勤怠新規追加フォーム |
| GET | `/edit-attendance/:id` | requireLogin | 勤怠編集フォーム |
| POST | `/update-attendance/:id` | requireLogin | 勤怠更新 |
| POST | `/delete-attendance/:id` | requireLogin | 勤怠削除 |
| GET | `/attendance/bulk-register` | requireLogin | 月次一括登録フォーム |
| POST | `/attendance/bulk-register` | requireLogin | 月次一括登録処理（既存データはスキップ） |
| GET | `/my-monthly-attendance` | requireLogin | 自分の月別勤怠照会（月選択、CSV エクスポート含む） |
| POST | `/request-approval` | requireLogin | 月次勤怠承認申請。ApprovalRequest を作成 |
| GET | `/print-attendance` | requireLogin | 勤怠表印刷用 HTML 出力 |

**打刻フロー:**

```
出勤打刻(checkin) → [昼休憩開始(start-lunch) → 昼休憩終了(end-lunch)] → 退勤打刻(checkout)
```

**勤務時間計算ロジック:**
- `workingHours = (checkOut - checkIn) - lunchTime - (30min の小数切捨て)`
- 9:30 以降の出勤 → 「遅刻」
- 18:00 以前の退勤 → 「早退」

---

### 7.3 ダッシュボード (dashboard.js)

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | `/dashboard` | requireLogin | メインダッシュボード（AI インサイト・KPI・勤怠グラフ・目標・最新日報など） |
| POST | `/feedback/semi` | requireLogin | 半期評価フィードバック送信 |
| GET | `/links` | requireLogin | 外部リンク集ページ |
| GET | `/debug/pretests` | requireLogin, isAdmin | 入社前テスト全件デバッグ表示 |
| GET | `/debug/my-pretests` | requireLogin | 自分のテスト結果デバッグ |

**ダッシュボードで集計するデータ:**

| データ | 内容 |
|--------|------|
| 今月の出勤日数・遅刻・残業 | Attendance 集計 |
| 今日の打刻状態 | 今日の Attendance レコード |
| 目標達成率（平均） | Goal 集計 |
| 休暇申請状況 | LeaveRequest 集計 |
| 給与未処理件数 | PayrollSlip(draft) 集計 |
| 半期評価グレード | computeSemiAnnualGrade() |
| AIインサイト（最大6件） | computeAIRecommendations() |
| 最新日報（5件） | DailyReport 最新 |
| 承認待ち目標件数 | Goal(pending1/pending2) |
| 出勤トレンドグラフ | 過去6か月 Chart.js |

---

### 7.4 管理者 (admin.js)

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | `/admin` | requireLogin, isAdmin | 管理者メニュー画面 |
| GET | `/admin/register-employee` | requireLogin, isAdmin | 社員登録フォーム |
| POST | `/admin/register-employee` | requireLogin, isAdmin | 社員登録処理（User + Employee 同時作成） |
| GET | `/admin/monthly-attendance` | requireLogin, isAdmin | 全社員月別勤怠一覧（月選択） |
| POST | `/admin/request-approval` | requireLogin, isAdmin | 勤怠承認リクエスト作成 API |
| POST | `/admin/approve-attendance` | requireLogin, isAdmin | 勤怠一括承認 API |
| GET | `/admin/print-attendance` | requireLogin, isAdmin | 社員勤怠表印刷用 HTML |
| GET | `/admin/approval-requests` | requireLogin, isAdmin | 承認リクエスト一覧（pending / returned） |
| POST | `/admin/return-request` | requireLogin, isAdmin | 勤怠差し戻し処理（理由付き）。**通知: 該当社員** |
| GET | `/admin/approve-request` | requireLogin, isAdmin | リダイレクト（旧パス互換） |
| GET | `/admin/approve-request/:id` | requireLogin, isAdmin | 勤怠承認処理 + メール送信。**通知: 該当社員** |
| GET | `/admin/reject-request/:id` | requireLogin, isAdmin | 勤怠却下処理 |
| GET | `/admin/view-attendance/:userId/:year/:month` | requireLogin, isAdmin | 特定社員の月別勤怠詳細 |
| GET | `/admin/users` | requireLogin, isAdmin | ユーザー一覧（管理者フラグ・パスワードリセット） |
| POST | `/admin/users/toggle-admin` | requireLogin, isAdmin | 管理者フラグ切り替え |
| POST | `/admin/users/reset-password` | requireLogin, isAdmin | パスワードリセット（bcrypt 再ハッシュ化） |

---

### 7.5 人事・給与・日報 (hr.js)

#### 人事管理

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | `/hr` | requireLogin | 社員一覧（管理者: 全員 / 一般: 自分のみ） |
| GET | `/hr/add` | requireLogin | 社員追加フォーム |
| POST | `/hr/add` | requireLogin | 社員追加処理 |
| GET | `/hr/edit/:id` | requireLogin | 社員情報編集フォーム |
| POST | `/hr/edit/:id` | requireLogin | 社員情報更新 |
| GET | `/hr/delete/:id` | requireLogin | 社員削除 |
| GET | `/hr/statistics` | requireLogin | 社員統計ページ（部署・役職・入社年別グラフ） |
| POST | `/hr/leave/:id` | requireLogin | 社員の休暇ステータス更新 |
| GET | `/hr/export` | requireLogin | 社員一覧 Excel エクスポート（ExcelJS） |
| POST | `/hr/photo/:id` | requireLogin | 社員写真アップロード（Multer、uploads/ に保存） |

#### 給与管理

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | `/hr/payroll/admin` | requireLogin | 給与管理トップ（管理者: 全社員一覧 / 一般: 自分） |
| GET | `/hr/payroll/admin/new` | requireLogin | 給与明細新規作成フォーム |
| POST | `/hr/payroll/admin/add` | requireLogin（isAdmin チェック内部） | 給与明細作成 + PayrollRun 作成。`issued` 以上なら **通知: 該当社員** |
| GET | `/hr/payroll/admin/edit/:slipId` | requireLogin | 給与明細編集フォーム |
| POST | `/hr/payroll/admin/edit/:slipId` | requireLogin（isAdmin チェック内部） | 給与明細更新。`draft→issued` 変更時 **通知: 該当社員** |
| POST | `/hr/payroll/admin/delete/:slipId` | requireLogin | 給与明細削除 |
| GET | `/hr/payroll` | requireLogin | 自分の給与明細一覧（直近12件） |
| GET | `/hr/payroll/:id` | requireLogin | 社員別給与明細詳細 |
| GET | `/hr/payroll/:id/export` | requireLogin | 給与明細 PDF エクスポート（html-pdf） |

#### 日報管理

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | `/hr/daily-report` | requireLogin | 日報一覧（全社員 / 自分フィルター、月選択） |
| GET | `/hr/daily-report/new` | requireLogin | 日報作成フォーム |
| POST | `/hr/daily-report/new` | requireLogin | 日報作成処理 |
| GET | `/hr/daily-report/:id` | requireLogin | 日報詳細（コメント・スタンプ表示） |
| GET | `/hr/daily-report/:id/edit` | requireLogin | 日報編集フォーム（作成者のみ） |
| POST | `/hr/daily-report/:id/edit` | requireLogin | 日報更新（作成者のみ） |
| POST | `/hr/daily-report/:id/delete` | requireLogin | 日報削除（作成者・管理者） |
| POST | `/hr/daily-report/:id/reaction` | requireLogin | 日報へのスタンプリアクション（トグル）。**通知: 日報作成者** |
| POST | `/hr/daily-report/:reportId/comment/:commentId/reaction` | requireLogin | コメントへのスタンプリアクション。**通知: コメント投稿者** |
| POST | `/hr/daily-report/:id/comment` | requireLogin | コメント投稿。**通知: 日報作成者** |

---

### 7.6 休暇申請 (leave.js)

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | `/leave/apply` | requireLogin | 休暇申請フォーム（残日数表示） |
| POST | `/leave/apply` | requireLogin | 休暇申請処理（LeaveRequest 作成、残日数チェック） |
| GET | `/leave/early` | requireLogin | 早退申請フォーム |
| POST | `/leave/early` | requireLogin | 早退申請処理 |
| GET | `/leave/my-requests` | requireLogin | 自分の申請一覧（ステータス別） |
| GET | `/admin/leave-requests` | requireLogin, isAdmin | 管理者: 全申請一覧（pending のみ） |
| POST | `/admin/approve-leave/:id` | requireLogin, isAdmin | 休暇承認処理。LeaveBalance から残日数を減算。**通知: 申請者** |
| POST | `/admin/reject-leave/:id` | requireLogin, isAdmin | 休暇却下処理。**通知: 申請者** |
| GET | `/admin/leave-balance` | requireLogin, isAdmin | 全社員残日数管理画面 |
| POST | `/admin/leave-balance/grant` | requireLogin, isAdmin | 残日数付与・調整 |

---

### 7.7 目標管理 (goals.js)

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | `/goals` | requireLogin | 目標一覧（自分 + 承認待ち） |
| GET | `/goals/add` | requireLogin | 目標作成フォーム（承認者選択） |
| POST | `/goals/add` | requireLogin | 目標作成（status: draft） |
| GET | `/goals/edit/:id` | requireLogin | 目標編集フォーム（draft / rejected のみ編集可） |
| POST | `/goals/edit/:id` | requireLogin | 目標更新 |
| GET | `/goals/detail/:id` | requireLogin | 目標詳細・履歴表示 |
| GET | `/goals/delete/:id` | requireLogin | 目標削除（draft のみ） |
| GET | `/goals/submit1/:id` | requireLogin | 1次承認依頼送信（status: pending1）。**通知: 1次承認者** |
| GET | `/goals/approve1/:id` | requireLogin | 1次承認（status: approved1）。**通知: 作成者** |
| GET | `/goals/reject1/:id` | requireLogin | 1次差し戻しフォーム |
| POST | `/goals/reject1/:id` | requireLogin | 1次差し戻し処理（status: rejected）。**通知: 作成者** |
| GET | `/goals/evaluate/:id` | requireLogin | 評価入力フォーム（approved1 → pending2 へ） |
| POST | `/goals/evaluate/:id` | requireLogin | 評価入力 + 2次承認依頼（status: pending2）。**通知: 2次承認者** |
| GET | `/goals/reject2/:id` | requireLogin | 2次差し戻しフォーム |
| POST | `/goals/reject2/:id` | requireLogin | 2次差し戻し処理（status: rejected）。**通知: 作成者** |
| GET | `/goals/approve2/:id` | requireLogin | 2次承認・最終完了（status: completed）。**通知: 作成者** |
| GET | `/goals/approval` | requireLogin | 承認待ち一覧（自分が承認者の目標） |
| GET | `/goals/report` | requireLogin | 目標レポート（管理者: 全員） |
| GET | `/api/ai/goal-suggestions` | なし | AI 目標提案 API（ランダム返却） |
| GET | `/goals/admin-fix/:id` | requireLogin, isAdmin | 管理者: 目標ステータス強制修正 |
| GET | `/goals/admin-fix-drafts/preview` | requireLogin, isAdmin | draft 目標一括確認プレビュー |
| POST | `/goals/admin-fix-drafts` | requireLogin, isAdmin | draft 目標一括ステータス修正 |
| GET | `/goals/admin-fix-drafts` | requireLogin, isAdmin | draft 一覧 |
| GET | `/goals/admin-backfill-createdBy` | requireLogin, isAdmin | createdBy フィールド補完バッチ |

**目標ワークフロー詳細:**

```
[社員]            [1次承認者]         [社員]          [2次承認者]
  │                    │                  │                 │
 作成(draft)           │                  │                 │
  │                    │                  │                 │
 submit1 ─────────────→│                  │                 │
  │              approve1/reject1         │                 │
  │←─────────────────────────────────────│                 │
  │                                    evaluate             │
  │ (承認時: approved1)               +submit2 ────────────→│
  │ (差し戻し: rejected)               │            approve2/reject2
  │                                    │←──────────────────│
  │                                   完了(completed)
  │                                   or 差し戻し(rejected)
```

---

### 7.8 掲示板 (board.js)

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | `/board` | requireLogin | 投稿一覧（ピン留め優先、検索・タグフィルター） |
| GET | `/board/new` | requireLogin | 新規投稿フォーム |
| POST | `/board` | requireLogin | 投稿作成（ファイル添付最大6件、Multer） |
| GET | `/board/:id` | requireLogin | 投稿詳細（閲覧数カウントアップ） |
| GET | `/board/:id/edit` | requireLogin | 編集フォーム（投稿者 or 管理者） |
| POST | `/board/:id/edit` | requireLogin | 投稿更新 |
| POST | `/board/:id/delete` | requireLogin | 投稿削除（投稿者 or 管理者） |
| POST | `/board/:id/like` | requireLogin | いいね数インクリメント |
| POST | `/board/:id/comment` | requireLogin | コメント追加 |
| POST | `/board/:id/pin` | requireLogin | ピン留めトグル（管理者のみ） |
| GET | `/links` | requireLogin | 外部リンク集（board.js に同居） |

---

### 7.9 入社前テスト (pretest.js)

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | `/pretest` | requireLogin | テストトップ（言語選択） |
| GET | `/pretest/:lang` | requireLogin | テスト本体（java / python） |
| GET | `/pretest/answers` | requireLogin | 回答・解説一覧（全言語） |
| GET | `/pretest/answers/:lang` | requireLogin | 特定言語の解説 |
| GET | `/pretest/answers/common` | requireLogin | 共通問題の解説 |
| POST | `/pretest/submit` | requireLogin | 回答送信・自動採点 → PretestSubmission 保存 |
| GET | `/admin/pretests` | isAdmin | 全提出一覧（管理者） |
| GET | `/admin/pretest/:id` | isAdmin | 提出詳細・問題別スコア表示 |

**採点ロジック (computePretestScore):**
- Q1〜Q20: 面接回答形式（キーワードマッチング、0〜1点/問）
- Q21〜Q40: コードレビュー形式（正規表現マッチング、0 / 0.5 / 1点/問）
- 満点: 40点

---

### 7.10 会社規定 (rules.js)

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | `/rules` | requireLogin | 規定一覧（カテゴリ別グループ表示） |
| GET | `/rules/new` | requireLogin, isAdmin | 規定新規作成フォーム |
| POST | `/rules/new` | requireLogin, isAdmin | 規定作成（Multer でファイル最大10件） |
| GET | `/rules/edit/:id` | requireLogin, isAdmin | 規定編集フォーム |
| POST | `/rules/edit/:id` | requireLogin, isAdmin | 規定更新（ファイル追加・削除） |
| GET | `/rules/download/:ruleId/:filename` | requireLogin | 添付ファイルダウンロード |
| POST | `/rules/delete/:id` | requireLogin, isAdmin | 規定削除（添付ファイルも物理削除） |

**対応ファイル形式:** PDF / Word / Excel / PowerPoint / 画像 / テキスト  
**最大ファイルサイズ:** 20MB / ファイル

---

### 7.11 スキルシート (skillsheet.js)

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | `/skillsheet` | requireLogin | 自分のスキルシート（管理者: 社員一覧） |
| GET | `/skillsheet/admin/:employeeId` | requireLogin | 管理者: 特定社員のスキルシート閲覧 |
| POST | `/skillsheet/admin/:employeeId/save` | requireLogin | 管理者: スキルシート保存 |
| GET | `/skillsheet/admin/:employeeId/export` | requireLogin | 管理者: スキルシート Excel エクスポート |
| POST | `/skillsheet/save` | requireLogin | 自分のスキルシート保存 |
| GET | `/skillsheet/export` | requireLogin | 自分のスキルシート Excel エクスポート |

**Excel エクスポート内容:** 基本情報・スキル一覧（★評価）・資格・職務経歴  
**getOrCreate:** スキルシートが存在しない場合は自動作成

---

### 7.12 AIチャットボット (chatbot.js)

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| POST | `/api/chatbot` | requireLogin | メッセージを受信、意図分類 → DB 照会 → 返答生成 |

**インテント分類 (classifyIntent):**

| インテント | キーワードパターン例 |
|-----------|-------------------|
| greeting | こんにち、おはよ、何ができ、使い方 |
| summary | サマリー、まとめ、今日の状況 |
| attendance_today | 今日の勤怠、打刻状況 |
| attendance_month | 今月の勤怠、遅刻、残業 |
| overtime | 残業、時間外 |
| goals_status | 目標の進捗、状況 |
| goals_approval | 目標の承認、申請 |
| leave_status | 休暇状況、有給残 |
| leave_apply | 休暇申請したい |
| payroll_status | 給与、明細、給料 |
| payroll_breakdown | 控除、社会保険 |
| grade_status | 評価、グレード、半期 |
| grade_improve | グレードを上げたい |
| dailyreport | 日報 |
| rules | 規定、就業規則 |
| board | 掲示板、お知らせ |
| approval_pending | 承認待ち件数 |
| navigation | どこ、ページの場所 |

**返答生成:** インテントに応じて MongoDB からリアルタイムデータを取得し、テキスト + クイックリプライボタン + リンクを返す  
**クライアント:** `renderPage.js` に埋め込まれたフローティングウィジェット（右下 FAB）

---

### 7.13 通知 (notifications.js)

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | `/api/notifications/unread-count` | requireLogin | 未読件数取得（30秒ポーリング） |
| GET | `/api/notifications/list` | requireLogin | 最新20件取得（ドロップダウン用） |
| POST | `/api/notifications/read-all` | requireLogin | 全件既読 |
| POST | `/api/notifications/:id/read` | requireLogin | 1件既読 |
| GET | `/notifications` | requireLogin | 通知一覧ページ（ページング 30件/ページ、アクセス時全既読） |

**createNotification 関数:**

```javascript
async function createNotification({
    userId,      // 受信者 User._id
    type,        // 通知種別
    title,       // タイトル
    body,        // 本文
    link,        // クリック先 URL
    fromUserId,  // 送信者（任意）
    fromName,    // 送信者名（任意）
    meta         // 追加データ（任意）
})
```

---

## 8. 通知システム

### 8.1 通知種別一覧

| type | 説明 | アイコン |
|------|------|---------|
| `comment` | 日報にコメントが投稿された | 💬 |
| `reaction` | 日報またはコメントにスタンプが押された | 😀 |
| `goal_approval` | 目標の承認依頼・承認・差し戻し | 📋 |
| `goal_deadline` | 目標の期日が3日以内に迫っている（スケジューラー） | 🎯 |
| `attendance_missing` | 前日の勤怠が未入力（スケジューラー） | ⏰ |
| `attendance_approved` | 勤怠が承認された | ✅ |
| `attendance_returned` | 勤怠が差し戻された | ↩ |
| `leave_approved` | 休暇申請が承認された | ✅ |
| `leave_rejected` | 休暇申請が却下された | ❌ |
| `payslip_issued` | 給与明細が発行された | 💴 |
| `ai_advice` | 週次 AI アドバイス（スケジューラー） | 🤖 |
| `system` | システム通知 | 📢 |

### 8.2 UI 構成

- **ヘッダーベルアイコン:** `notif-bell-btn` クリックで `toggleNotifDropdown()` 呼び出し
- **未読バッジ:** 赤丸の数字（30秒ごとにポーリング更新）
- **ドロップダウン:** 最新20件表示。未読は青ボーダーで強調
- **クリック動作:** `openNotif(id, link)` → 既読 API 呼び出し → link に遷移
- **「全て見る」リンク:** `/notifications` ページ（ページング付き全件表示）

---

## 9. スケジューラー

**lib/notificationScheduler.js** — `startScheduler()` を `server.js` 起動時に呼び出し

| 関数 | cron 式 | タイムゾーン | トリガー条件 | 動作 |
|------|---------|------------|------------|------|
| `checkGoalDeadlines()` | `0 9 * * *` | Asia/Tokyo | 毎朝9時 | 期日が今日〜3日以内で未完了の目標を持つ社員に通知 |
| `checkAttendanceMissing()` | `0 9 * * 1-5` | Asia/Tokyo | 平日（月〜金）毎朝9時 | 前営業日の勤怠が未入力の社員全員に通知 |
| `generateAiAdvice()` | `0 9 * * 1` | Asia/Tokyo | 毎週月曜朝9時 | 全ユーザーにランダムな AI アドバイスを通知 |

---

## 10. メール送信

**config/mailer.js** — `sendMail({ to, from, subject, text, html, attachments })`

| 優先度 | 方式 | 条件 |
|--------|------|------|
| 1 | SendGrid API | `SENDGRID_API_KEY` が `SG.` で始まる場合 |
| 2 | Brevo REST API | `SENDGRID_API_KEY` が `xkeysib-` で始まる場合 |
| 3 | SMTP フォールバック | 上記以外（Brevo SMTP: `smtp-relay.brevo.com:587`） |

**メール送信タイミング（admin.js）:**
- 勤怠承認（`/admin/approve-request/:id`）: 承認完了後にメール送信（勤怠表 HTML 添付）

---

## 11. AI・Scoring エンジン

### 11.1 ダッシュボード AI インサイト

`computeAIRecommendations()` が以下データを受け取り、最大6件のインサイトを confidence スコア降順で返す:

| 入力 | 説明 |
|------|------|
| `attendanceSummary` | 今月の出勤・遅刻・早退・残業集計 |
| `goalSummary` | 目標平均達成率 |
| `leaveSummary` | 申請状況・今後の予定 |
| `payrollSummary` | 未処理給与件数 |
| `monthlyAttendance` | 今月の日別勤怠配列 |
| `attendanceTrend` | 過去6か月の月別出勤日数 |
| `goalsDetail` | 目標詳細リスト |
| `now` | 現在日時 |

### 11.2 入社前テスト採点

`computePretestScore(answers, lang)`:
- Q1〜Q20: 面接回答形式（テキストにキーワードが含まれるかチェック）
- Q21〜Q40: コードレビュー形式（正規表現パターンマッチング）
- 部分点（0.5）あり

### 11.3 半期評価グレード計算

`computeSemiAnnualGrade(userId, employee)`:
- 過去6か月のデータを自動集計
- 5カテゴリ・10サブ項目で100点満点評価
- 改善アクション（priority: high/medium/low）を最大7件生成
- グレード: S / A / B / C / D

---

## 12. ページレンダリング (renderPage.js)

`renderPage(req, res, title, mainTitle, descriptionHtml)` が生成する HTML 構造:

```html
<!DOCTYPE html>
<html>
<head>
    <!-- CSS: FontAwesome, Google Fonts, カスタムスタイル -->
</head>
<body>
<div class="sidebar">
    <!-- ロゴ、メニューリンク、管理者メニュー（折りたたみ）、教育サブメニュー -->
</div>
<div class="app-wrapper">
    <div class="topbar">
        <!-- ページタイトル、日時時計(id=topbar-clock)、管理者バッジ、通知ベル -->
        <div class="notif-bell-wrap">
            <button id="notif-bell-btn" onclick="toggleNotifDropdown()">🔔</button>
            <span id="notif-bell-badge"></span> <!-- 未読数 -->
            <div id="notif-dropdown"> <!-- ドロップダウン --> </div>
        </div>
    </div>
    <div class="main">
        <!-- descriptionHtml または mainTitle ヘッダー -->
    </div>
    </div>
    <script>
        // updateClock(), toggleNotifDropdown(), loadNotifList(),
        // openNotif(), markAllRead(), fetchUnreadCount(),
        // bindToggle(), admin-toggle
    </script>
    <!-- pageFooter(): チャットボットウィジェット FAB -->
</div>
</body>
</html>
```

---

## 13. 権限モデル

| ロール | 条件 | アクセス可能機能 |
|--------|------|----------------|
| **管理者** | `session.isAdmin === true` | 全機能 |
| **一般ユーザー** | `session.isAdmin === false` | 自分のデータの参照・編集、申請、目標・日報・スキルシート |
| **未認証** | `session.userId` が未設定 | `/login`、`/register`、`/pretest/*` のみ |

**管理者専用機能:**
- 社員登録・管理、ユーザー管理（管理者昇格、PW リセット）
- 全社員勤怠一覧・承認・差し戻し
- 休暇申請の承認・却下・残日数付与
- 給与明細の作成・編集・削除
- 会社規定の作成・編集・削除
- 入社前テスト全件閲覧
- 目標管理の管理者バッチ操作

---

## 14. セッション管理

**express-session 設定:**

| 項目 | 値 |
|------|-----|
| secret | `SESSION_SECRET` 環境変数（デフォルト: 固定文字列） |
| resave | false |
| saveUninitialized | false |
| cookie.secure | false（HTTP 対応） |
| cookie.maxAge | 24時間 |

**セッションに保存されるデータ:**

| キー | 内容 |
|------|------|
| `userId` | User の ObjectId |
| `username` | ユーザー名 |
| `isAdmin` | 管理者フラグ |
| `employee` | Employee オブジェクト（キャッシュ） |

---

## 15. ファイルアップロード

| 機能 | パス | ストレージ | 最大ファイル数 | 最大サイズ |
|------|------|-----------|--------------|---------|
| 社員写真 | `POST /hr/photo/:id` | `uploads/` | 1 | デフォルト |
| 掲示板添付 | `POST /board` | メモリ → DB URL | 6 | デフォルト |
| 会社規定添付 | `POST /rules/new`, `POST /rules/edit/:id` | `uploads/rules/` | 10 | 20MB |

**ファイル名生成:** `{timestamp}-{random6digit}{ext}`（latin1 → UTF-8 変換あり）

---

## 16. 通知トリガー一覧

### リアルタイム通知（操作をトリガーに即時発生）

| # | 発生タイミング | 受信者 | type | ファイル |
|---|--------------|--------|------|---------|
| 1 | 日報にコメント投稿（自分以外） | 日報作成者 | comment | hr.js |
| 2 | 日報にスタンプリアクション（自分以外） | 日報作成者 | reaction | hr.js |
| 3 | 日報のコメントにスタンプ（自分以外） | コメント投稿者 | reaction | hr.js |
| 4 | 休暇申請が承認された | 申請者 | leave_approved | leave.js |
| 5 | 休暇申請が却下された | 申請者 | leave_rejected | leave.js |
| 6 | 勤怠が承認された | 該当社員 | attendance_approved | admin.js |
| 7 | 勤怠が差し戻された | 該当社員 | attendance_returned | admin.js |
| 8 | 給与明細が発行された（新規作成で issued 以上） | 該当社員 | payslip_issued | hr.js |
| 9 | 給与明細が draft → issued 以上に変更 | 該当社員 | payslip_issued | hr.js |
| 10 | 目標の1次承認依頼を送信 | 1次承認者 | goal_approval | goals.js |
| 11 | 目標が1次承認された | 作成者 | goal_approval | goals.js |
| 12 | 目標が1次差し戻しされた | 作成者 | goal_approval | goals.js |
| 13 | 目標の2次承認依頼を送信 | 2次承認者 | goal_approval | goals.js |
| 14 | 目標が2次差し戻しされた | 作成者 | goal_approval | goals.js |
| 15 | 目標が最終承認された（2次承認） | 作成者 | goal_approval | goals.js |

### 自動通知（スケジューラー）

| # | スケジュール | 受信者 | type | 条件 |
|---|------------|--------|------|------|
| 16 | 毎朝9時 | 目標を持つ本人 | goal_deadline | 期日が今日〜3日以内で未完了 |
| 17 | 平日毎朝9時 | 勤怠未入力の社員 | attendance_missing | 前営業日の勤怠なし |
| 18 | 毎週月曜9時 | 全ユーザー | ai_advice | 無条件 |

---

## 17. 画面遷移フロー

### ログインフロー

```
/login (GET) → POST /login → /dashboard
                                ↓
                         メインダッシュボード
```

### 勤怠打刻フロー

```
/attendance-main → POST /checkin → POST /start-lunch → POST /end-lunch → POST /checkout
                         ↓
              今日の勤怠が Attendance に記録される
                         ↓
        月次確認: /my-monthly-attendance → POST /request-approval
                                                ↓
                               /admin/approval-requests（管理者）
                                    ↓              ↓
                     GET /admin/approve-request/:id  POST /admin/return-request
                           （承認・通知送信）            （差し戻し・通知送信）
```

### 目標管理フロー

```
/goals/add → /goals（一覧）
               ↓
        GET /goals/submit1/:id（1次申請）
               ↓ 通知 → 承認者
        GET /goals/approve1/:id（1次承認）
               ↓ 通知 → 作成者
        GET /goals/evaluate/:id（評価入力）
        POST /goals/evaluate/:id（2次申請）
               ↓ 通知 → 2次承認者
        GET /goals/approve2/:id（最終承認）
               ↓ 通知 → 作成者
             completed
```

### 休暇申請フロー

```
/leave/apply → POST /leave/apply（LeaveRequest 作成）
                        ↓
              /admin/leave-requests（管理者確認）
                ↓                    ↓
POST /admin/approve-leave/:id  POST /admin/reject-leave/:id
  （残日数減算・通知送信）          （通知送信）
```

### 給与明細フロー

```
/hr/payroll/admin/new → POST /hr/payroll/admin/add（PayrollRun + PayrollSlip 作成）
                                    ↓ (status = issued 以上で通知)
                         /hr/payroll/:id（社員が閲覧）
                                    ↓
                         GET /hr/payroll/:id/export（PDF 出力）
```

---

## 環境変数一覧

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `MONGODB_URI` | MongoDB Atlas 接続文字列 | ✅ |
| `SESSION_SECRET` | セッション署名キー | 推奨 |
| `SENDGRID_API_KEY` | SendGrid または Brevo の API キー | メール使用時 |
| `SMTP_HOST` | SMTP ホスト（デフォルト: smtp-relay.brevo.com） | メール使用時 |
| `SMTP_PORT` | SMTP ポート（デフォルト: 587） | メール使用時 |
| `SMTP_USER` | SMTP ユーザー名 | メール使用時 |
| `SMTP_PASS` | SMTP パスワード | メール使用時 |
| `PORT` | 起動ポート（デフォルト: 3000） | 任意 |

---

*本設計書は 2026-04-09 時点のコードベースに基づいて自動生成されました。*
