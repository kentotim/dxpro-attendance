# 06. 管理者機能

関連ファイル: `routes/admin.js`（1228行）

---

## 1. エンドポイント一覧

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | `/admin` | requireLogin + isAdmin | 管理者メニュー画面 |
| GET | `/admin/register-employee` | requireLogin + isAdmin | 社員登録フォーム |
| POST | `/admin/register-employee` | requireLogin + isAdmin | 社員登録処理 |
| GET | `/admin/monthly-attendance` | requireLogin + isAdmin | 全社員月別勤怠一覧 |
| POST | `/admin/request-approval` | requireLogin + isAdmin | 勤怠承認リクエスト作成 API |
| POST | `/admin/approve-attendance` | requireLogin + isAdmin | 勤怠一括承認 API |
| GET | `/admin/print-attendance` | requireLogin + isAdmin | 社員勤怠表印刷用 HTML |
| GET | `/admin/approval-requests` | requireLogin + isAdmin | 承認リクエスト一覧 |
| POST | `/admin/return-request` | requireLogin + isAdmin | 勤怠差し戻し ＋**通知** |
| GET | `/admin/approve-request` | requireLogin + isAdmin | リダイレクト（旧パス互換） |
| GET | `/admin/approve-request/:id` | requireLogin + isAdmin | 勤怠承認 ＋**通知** ＋メール |
| GET | `/admin/reject-request/:id` | requireLogin + isAdmin | 勤怠却下 |
| GET | `/admin/view-attendance/:userId/:year/:month` | requireLogin + isAdmin | 特定社員の月別勤怠詳細 |
| GET | `/admin/users` | requireLogin + isAdmin | ユーザー一覧 |
| POST | `/admin/users/toggle-admin` | requireLogin + isAdmin | 管理者フラグ切り替え |
| POST | `/admin/users/reset-password` | requireLogin + isAdmin | パスワードリセット |

---

## 2. 社員登録フロー

```
GET /admin/register-employee  →  フォーム表示（ユーザー一覧から選択）

POST /admin/register-employee
  ├── User.findById(userId) で紐づくユーザーを確認
  ├── Employee.create({
  │     userId, employeeId, name, department, position,
  │     joinDate, contact, email
  │   })
  └── redirect → /admin
```

---

## 3. 勤怠承認フロー

```
GET /admin/approval-requests
  └── ApprovalRequest.find({ status: 'pending' or 'returned' }) を一覧表示

GET /admin/approve-request/:id （承認）
  ├── ApprovalRequest.status → 'approved'
  ├── 当月全勤怠レコード isConfirmed = true
  ├── メール送信（勤怠表 HTML を添付）
  └── createNotification({ type: 'attendance_approved', 受信者: 当該社員 })

POST /admin/return-request （差し戻し）
  ├── ApprovalRequest.status → 'returned'
  ├── returnReason をセット
  └── createNotification({ type: 'attendance_returned', 受信者: 当該社員 })

GET /admin/reject-request/:id （却下）
  └── ApprovalRequest.status → 'rejected'
```

---

## 4. 勤怠一覧・確認

| パス | 内容 |
|------|------|
| GET `/admin/monthly-attendance` | 全社員の指定月勤怠サマリー（出勤日数・残業・承認状況） |
| GET `/admin/view-attendance/:userId/:year/:month` | 特定社員の日別勤怠詳細（編集リンク付き） |
| GET `/admin/print-attendance` | 社員勤怠表の印刷用 HTML 出力 |

---

## 5. ユーザー管理

```
GET /admin/users
  └── User 一覧（isAdmin フラグ・Employee 紐づき確認）

POST /admin/users/toggle-admin
  └── User.isAdmin を true/false に切り替え

POST /admin/users/reset-password
  ├── bcryptjs.hash(newPassword, 10)
  └── User.findByIdAndUpdate({password: hashed})
```
