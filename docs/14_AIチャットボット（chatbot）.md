# 14. AI チャットボット

関連ファイル: `routes/chatbot.js`（452行）

---

## 1. エンドポイント

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| POST | `/api/chatbot` | requireLogin | メッセージ受信・返答生成 |

---

## 2. 処理フロー

```
POST /api/chatbot
  ├── body.message（ユーザー入力テキスト）を受信
  ├── classifyIntent(message) でインテント分類
  ├── インテントに応じた MongoDB クエリを実行
  └── JSON レスポンス返却:
       {
         reply: "返答テキスト",
         quickReplies: ["ボタン1", "ボタン2"],
         link: { text: "ページを開く", url: "/dashboard" }
       }
```

---

## 3. インテント分類一覧（classifyIntent）

| インテント | キーワードパターン例 | DB 参照先 |
|-----------|-------------------|----------|
| `greeting` | こんにち、おはよ、何ができ、使い方 | — |
| `thanks` | ありがと、助かった | — |
| `time` | 今何時、時刻 | — |
| `date` | 今日は何日、日付 | — |
| `summary` | サマリー、まとめ、今日の状況 | Attendance + Goal |
| `attendance_today` | 今日の勤怠、打刻状況 | Attendance（今日） |
| `attendance_month` | 今月の勤怠 | Attendance（今月集計） |
| `attendance_late` | 遅刻した日、何回遅刻 | Attendance（status: 遅刻） |
| `attendance_absent` | 欠勤 | Attendance（status: 欠勤） |
| `overtime` | 残業、時間外 | Attendance（workingHours） |
| `attendance_calendar` | 勤怠カレンダー | Attendance（月別） |
| `stamp_missing` | 打刻漏れ | Attendance（今日の checkIn/checkOut） |
| `stamp_checkin` | 出勤打刻 | Attendance |
| `stamp_checkout` | 退勤打刻 | Attendance |
| `goals_status` | 目標の進捗、状況 | Goal（自分の目標） |
| `goals_overdue` | 期日超過の目標 | Goal（deadline < now） |
| `goals_create` | 目標を作りたい | — |
| `goals_approval` | 目標の承認 | Goal（pending1/pending2） |
| `leave_status` | 休暇状況、有給残 | LeaveRequest + LeaveBalance |
| `leave_apply` | 休暇申請したい | — |
| `payroll_status` | 給与明細、明細の状況 | PayrollSlip |
| `payroll_breakdown` | 控除内訳、社会保険 | PayrollSlip（最新） |
| `grade_status` | 評価、グレード、半期 | computeSemiAnnualGrade() |
| `grade_improve` | グレードを上げたい | computeSemiAnnualGrade() |
| `dailyreport_write` | 日報を書きたい | — |
| `dailyreport` | 日報の確認 | DailyReport（最新） |
| `rules` | 規定、就業規則 | CompanyRule |
| `board` | 掲示板、お知らせ | BoardPost（最新） |
| `team` | チームメンバー | Employee |
| `approval_pending` | 承認待ち | Goal + ApprovalRequest + LeaveRequest |
| `navigation` | どこにある、ページの場所 | — |
| `weather` | 天気 | — |

---

## 4. UI（チャットボットウィジェット）

`renderPage.js` の `pageFooter()` に埋め込まれている。

| 要素 | 説明 |
|------|------|
| FAB ボタン | 右下の 🤖 ボタン（`chatbot-toggle`） |
| チャットウィンドウ | クリックで開閉、`chatbot-window` |
| メッセージ表示エリア | `chatbot-messages`（バブル形式） |
| 入力欄 | `chatbot-input`（Enter で送信） |
| クイックリプライ | ボタン形式でサジェスト |
| リンクボタン | 返答に含まれる場合のみ表示 |

### メッセージ送信処理（クライアント JS）

```javascript
// Enter キーまたは送信ボタンで発火
fetch('/api/chatbot', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ message: inputText })
})
.then(res => res.json())
.then(data => {
  // reply をバブルとして追加
  // quickReplies をボタンとして表示
  // link があればリンクボタンを追加
});
```
