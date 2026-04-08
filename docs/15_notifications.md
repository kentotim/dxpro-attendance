# 15. 通知システム

関連ファイル: `routes/notifications.js`（167行）、`lib/notificationScheduler.js`（128行）

---

## 1. エンドポイント一覧

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | `/api/notifications/unread-count` | requireLogin | 未読件数取得（ポーリング用） |
| GET | `/api/notifications/list` | requireLogin | 最新20件取得（ドロップダウン用） |
| POST | `/api/notifications/read-all` | requireLogin | 全件既読 |
| POST | `/api/notifications/:id/read` | requireLogin | 1件既読 |
| GET | `/notifications` | requireLogin | 通知一覧ページ（30件/ページ） |

---

## 2. createNotification 関数

他のルートから import して使用する共通ヘルパー。

```javascript
async function createNotification({
    userId,      // 受信者 User._id（必須）
    type,        // 通知種別（必須）
    title,       // タイトル（必須）
    body,        // 本文
    link,        // クリック先 URL
    fromUserId,  // 送信者（任意、システム通知は省略）
    fromName,    // 送信者名（任意）
    meta         // 追加データ（任意）
})
// → Notification.create({...}) を実行
```

---

## 3. 通知種別一覧

| type | 意味 | アイコン |
|------|------|---------|
| `comment` | 日報にコメントが投稿された | 💬 |
| `reaction` | スタンプリアクションが押された | 😀 |
| `goal_approval` | 目標の承認依頼・承認・差し戻し | 📋 |
| `goal_deadline` | 目標の期日が3日以内（スケジューラー） | 🎯 |
| `attendance_missing` | 前日の勤怠が未入力（スケジューラー） | ⏰ |
| `attendance_approved` | 勤怠が承認された | ✅ |
| `attendance_returned` | 勤怠が差し戻された | ↩ |
| `leave_approved` | 休暇申請が承認された | ✅ |
| `leave_rejected` | 休暇申請が却下された | ❌ |
| `payslip_issued` | 給与明細が発行された | 💴 |
| `ai_advice` | 週次 AI アドバイス（スケジューラー） | 🤖 |
| `system` | システム通知 | 📢 |

---

## 4. リアルタイム通知トリガー一覧

| # | 発生タイミング | 受信者 | type | 発生ファイル |
|---|--------------|--------|------|------------|
| 1 | 日報にコメント投稿（自分以外） | 日報作成者 | `comment` | hr.js |
| 2 | 日報にスタンプ（自分以外） | 日報作成者 | `reaction` | hr.js |
| 3 | 日報コメントにスタンプ（自分以外） | コメント投稿者 | `reaction` | hr.js |
| 4 | 休暇申請が承認された | 申請者 | `leave_approved` | leave.js |
| 5 | 休暇申請が却下された | 申請者 | `leave_rejected` | leave.js |
| 6 | 勤怠が承認された | 該当社員 | `attendance_approved` | admin.js |
| 7 | 勤怠が差し戻された | 該当社員 | `attendance_returned` | admin.js |
| 8 | 給与明細が新規発行（issued 以上） | 該当社員 | `payslip_issued` | hr.js |
| 9 | 給与明細が draft → issued に変更 | 該当社員 | `payslip_issued` | hr.js |
| 10 | 目標の1次承認依頼を送信 | 1次承認者 | `goal_approval` | goals.js |
| 11 | 目標が1次承認された | 作成者 | `goal_approval` | goals.js |
| 12 | 目標が1次差し戻しされた | 作成者 | `goal_approval` | goals.js |
| 13 | 目標の2次承認依頼を送信 | 2次承認者 | `goal_approval` | goals.js |
| 14 | 目標が2次差し戻しされた | 作成者 | `goal_approval` | goals.js |
| 15 | 目標が最終承認された（2次承認） | 作成者 | `goal_approval` | goals.js |

---

## 5. スケジュール自動通知

定義ファイル: `lib/notificationScheduler.js`

| # | 関数 | cron 式 | タイムゾーン | 条件 | 受信者 |
|---|------|---------|------------|------|--------|
| 16 | `checkGoalDeadlines()` | `0 9 * * *` | Asia/Tokyo | 期日が今日〜3日以内かつ未完了の目標あり | 目標作成者 |
| 17 | `checkAttendanceMissing()` | `0 9 * * 1-5` | Asia/Tokyo | 前営業日の勤怠が未入力 | 対象社員 |
| 18 | `generateAiAdvice()` | `0 9 * * 1` | Asia/Tokyo | 全ユーザー（無条件） | 全ユーザー |

```javascript
// server.js 起動時に呼び出し
startScheduler(); // → 3つの cron をスタート
```

---

## 6. 通知 UI

| 要素 | 説明 |
|------|------|
| ベルアイコン | ヘッダー右端の 🔔 ボタン（`notif-bell-btn`） |
| 未読バッジ | 赤丸の未読数（`notif-bell-badge`）。30秒ごとにポーリング更新 |
| ドロップダウン | ベルクリックで開閉（`notif-dropdown`）。最新20件表示 |
| 未読スタイル | 未読通知は青いボーダーで強調表示 |
| クリック動作 | `openNotif(id, link)` → 既読 API → link に遷移 |
| 「全て見る」 | `/notifications` ページへのリンク（ページング付き全件） |

### ポーリング処理（クライアント JS）

```javascript
// renderPage.js に埋め込み
setInterval(fetchUnreadCount, 30000); // 30秒ごとに未読数を取得

async function fetchUnreadCount() {
    const res = await fetch('/api/notifications/unread-count');
    const { count } = await res.json();
    document.getElementById('notif-bell-badge').textContent = count || '';
}
```

---

## 7. 通知一覧ページ（/notifications）

- アクセス時に全通知を既読にする（`isRead: true` に一括更新）
- 30件/ページのページネーション
- 日付・タイプ・タイトル・本文・リンクを表示
