# 08. 休暇申請・承認・残日数管理

関連ファイル: `routes/leave.js`（614行）

---

## 1. エンドポイント一覧

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | `/leave/apply` | requireLogin | 休暇申請フォーム（残日数表示） |
| POST | `/leave/apply` | requireLogin | 休暇申請処理 |
| GET | `/leave/early` | requireLogin | 早退申請フォーム |
| POST | `/leave/early` | requireLogin | 早退申請処理 |
| GET | `/leave/my-requests` | requireLogin | 自分の申請一覧 |
| GET | `/admin/leave-requests` | requireLogin + isAdmin | 管理者: 全申請一覧 |
| POST | `/admin/approve-leave/:id` | requireLogin + isAdmin | 休暇承認 ＋**通知** |
| POST | `/admin/reject-leave/:id` | requireLogin + isAdmin | 休暇却下 ＋**通知** |
| GET | `/admin/leave-balance` | requireLogin + isAdmin | 全社員残日数管理画面 |
| POST | `/admin/leave-balance/grant` | requireLogin + isAdmin | 残日数付与・調整 |

---

## 2. 休暇申請フロー

```
GET /leave/apply
  └── LeaveBalance を参照して残日数を表示

POST /leave/apply
  ├── 残日数チェック（有給 / 病欠 / 慶弔 / その他）
  ├── LeaveRequest.create({
  │     userId, employeeId, name, department,
  │     leaveType, halfDay, startDate, endDate, days, reason,
  │     status: 'pending'
  │   })
  └── redirect → /leave/my-requests
```

---

## 3. 承認・却下フロー

```
POST /admin/approve-leave/:id （承認）
  ├── LeaveRequest.status → 'approved'
  ├── LeaveBalance から該当 leaveType の残日数を減算（days 分）
  │     LeaveBalance.history に記録
  └── createNotification({ type: 'leave_approved', 受信者: 申請者 })

POST /admin/reject-leave/:id （却下）
  ├── LeaveRequest.status → 'rejected'
  └── createNotification({ type: 'leave_rejected', 受信者: 申請者 })
```

---

## 4. 早退申請

```
POST /leave/early
  └── LeaveRequest.create({
        leaveType: '早退',
        earlyLeaveTime: HH:MM,
        status: 'pending'
      })
```

---

## 5. 休暇種別一覧

| leaveType | 内容 | 残日数消費 |
|-----------|------|-----------|
| 有給 | 有給休暇 | paid から減算 |
| 病欠 | 病気欠勤 | sick から減算 |
| 慶弔 | 慶弔休暇 | special から減算 |
| その他 | 特別事情など | other から減算 |
| 午前休 | 午前半休（halfDay: AM） | paid × 0.5 |
| 午後休 | 午後半休（halfDay: PM） | paid × 0.5 |
| 早退 | 早退届 | 残日数非消費 |

---

## 6. 残日数管理

```
GET /admin/leave-balance
  └── 全社員の LeaveBalance を一覧表示（有給/病欠/慶弔/その他）

POST /admin/leave-balance/grant
  ├── LeaveBalance を upsert（社員未作成の場合は create）
  ├── 指定 leaveType の残日数を加算
  └── LeaveBalance.history に付与履歴を追記
```

---

## 7. 申請ステータス遷移

```
pending → approved （承認: 残日数減算 + 通知）
pending → rejected （却下: 通知）
pending → canceled （本人キャンセル）
```
