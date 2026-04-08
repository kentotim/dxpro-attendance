# 04. 勤怠管理

関連ファイル: `routes/attendance.js`（1726行）

---

## 1. エンドポイント一覧

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | `/attendance-main` | requireLogin | 勤怠メイン画面 |
| POST | `/checkin` | requireLogin | 出勤打刻 |
| POST | `/start-lunch` | requireLogin | 昼休憩開始打刻 |
| POST | `/end-lunch` | requireLogin | 昼休憩終了打刻 |
| POST | `/checkout` | requireLogin | 退勤打刻 |
| POST | `/save-attendance` | requireLogin | 勤怠フォーム保存 |
| GET | `/add-attendance` | requireLogin | 勤怠新規追加フォーム |
| GET | `/edit-attendance/:id` | requireLogin | 勤怠編集フォーム |
| POST | `/update-attendance/:id` | requireLogin | 勤怠更新 |
| POST | `/delete-attendance/:id` | requireLogin | 勤怠削除 |
| GET | `/attendance/bulk-register` | requireLogin | 月次一括登録フォーム |
| POST | `/attendance/bulk-register` | requireLogin | 月次一括登録処理 |
| GET | `/my-monthly-attendance` | requireLogin | 自分の月別勤怠照会 |
| POST | `/request-approval` | requireLogin | 月次勤怠承認申請 |
| GET | `/print-attendance` | requireLogin | 勤怠表印刷用 HTML |

---

## 2. 打刻フロー

```
出勤打刻(checkin)
    │
    ├── [任意] 昼休憩開始(start-lunch)
    │              └── 昼休憩終了(end-lunch)
    │
    └── 退勤打刻(checkout)
             └── 実労働時間・ステータスを自動計算して保存
```

### 各打刻の詳細

| 打刻 | 処理内容 |
|------|---------|
| `POST /checkin` | 今日の Attendance レコードを作成（既に出勤済みなら 400 エラー） |
| `POST /start-lunch` | 今日の Attendance に `lunchStart` をセット |
| `POST /end-lunch` | 今日の Attendance に `lunchEnd` をセット |
| `POST /checkout` | `checkOut` をセット + 勤務時間・ステータスを自動計算して保存 |

---

## 3. 勤務時間計算ロジック

```
lunchTime = (lunchEnd - lunchStart)  ※打刻がある場合のみ
totalHours = (checkOut - checkIn) の時間数
workingHours = totalHours - lunchTime（小数点以下30分切り捨て）

status 判定:
  checkIn > 09:30  → 「遅刻」
  checkOut < 18:00 → 「早退」
  どちらもなし     → 「正常」
  その他           → 「欠勤」
```

---

## 4. 月次一括登録

```
GET/POST /attendance/bulk-register
  ├── 対象月の全営業日を生成
  ├── 既存データが存在する日付はスキップ
  └── 残りの日付に空の勤怠レコードを一括 insert
```

---

## 5. 月次承認申請フロー

```
POST /request-approval（社員）
  └── ApprovalRequest.create({
        employeeId, userId, year, month,
        status: 'pending'
      })

↓ 管理者が /admin/approval-requests で確認

GET /admin/approve-request/:id（管理者）
  ├── ApprovalRequest.status → 'approved'
  ├── 該当月の全勤怠レコード isConfirmed = true
  ├── メール送信（勤怠表 HTML 添付）
  └── 通知: 該当社員 → type: attendance_approved

POST /admin/return-request（管理者）
  ├── ApprovalRequest.status → 'returned'
  ├── returnReason をセット
  └── 通知: 該当社員 → type: attendance_returned
```

---

## 6. 勤怠メイン画面の表示データ

| データ | 内容 |
|--------|------|
| 今月カレンダー | 日別勤怠データ（出勤/退勤/状態） |
| 今日の打刻状態 | checkin / lunchStart / lunchEnd / checkout 各打刻済み判定 |
| 今月サマリー | 出勤日数・遅刻回数・早退回数・残業時間・欠勤日数 |
| 承認状況 | ApprovalRequest の今月ステータス |

---

## 7. 印刷・エクスポート

| 機能 | パス | 出力形式 |
|------|------|---------|
| 個人勤怠表印刷 | GET `/print-attendance` | HTML（ブラウザ印刷） |
| 管理者用印刷 | GET `/admin/print-attendance` | HTML（ブラウザ印刷） |
| 月別勤怠照会 | GET `/my-monthly-attendance` | 画面表示（CSV エクスポートあり） |
