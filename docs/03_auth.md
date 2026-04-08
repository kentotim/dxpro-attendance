# 03. 認証・権限・セッション管理

関連ファイル: `routes/auth.js` / `middleware/auth.js`

---

## 1. エンドポイント一覧

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | `/` | requireLogin | ルートリダイレクト → `/dashboard` |
| GET | `/login` | なし | ログイン画面 |
| POST | `/login` | なし | ログイン処理 |
| GET | `/logout` | なし | ログアウト処理 |
| GET | `/register` | なし | ユーザー登録画面 |
| POST | `/register` | なし | ユーザー登録処理 |
| GET | `/change-password` | requireLogin | パスワード変更画面 |
| POST | `/change-password` | requireLogin | パスワード変更処理 |

---

## 2. ログイン処理フロー

```
POST /login
  ├── username で User を検索
  ├── bcryptjs.compare(入力password, hashedPassword)
  ├── 照合成功 →
  │     session.userId    = user._id
  │     session.username  = user.username
  │     session.isAdmin   = user.isAdmin
  │     session.employee  = employee（Employee.findOne({userId})）
  │     redirect → /dashboard
  └── 失敗 → エラーコードを getErrorMessageJP() で日本語化してログインページ再表示
```

---

## 3. ユーザー登録処理フロー

```
POST /register
  ├── username 重複チェック
  ├── bcryptjs.hash(password, 10)
  ├── User.create({username, password: hashed})
  └── redirect → /login
```

---

## 4. パスワード変更処理フロー

```
POST /change-password
  ├── 現在のパスワードを bcryptjs.compare で確認
  ├── 新パスワードと確認用が一致するか確認
  ├── bcryptjs.hash(newPassword, 10)
  ├── User.findByIdAndUpdate(session.userId, {password: hashed})
  └── 成功メッセージ表示 / 失敗時 getPasswordErrorMessage() で日本語化
```

---

## 5. ミドルウェア

### requireLogin

```javascript
// middleware/auth.js
function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
}
```

### isAdmin

```javascript
// middleware/auth.js
function isAdmin(req, res, next) {
    if (!req.session.isAdmin) {
        return res.status(403).send('403 Forbidden');
    }
    next();
}
```

---

## 6. 権限モデル

| ロール | 条件 | アクセス可能機能 |
|--------|------|----------------|
| **管理者** | `session.isAdmin === true` | 全機能 |
| **一般ユーザー** | `session.isAdmin === false` | 自分のデータ参照・編集、各種申請、日報・目標・スキルシート |
| **未認証** | `session.userId` が未設定 | `/login`、`/register`、`/pretest/*` のみ |

### 管理者専用機能一覧

| 機能 | パス |
|------|------|
| 社員登録 | POST `/admin/register-employee` |
| ユーザー一覧・権限操作 | GET/POST `/admin/users/*` |
| 全社員勤怠一覧 | GET `/admin/monthly-attendance` |
| 勤怠承認・差し戻し | GET/POST `/admin/approve-request/*` |
| 休暇申請 承認・却下 | POST `/admin/approve-leave/:id` / `/admin/reject-leave/:id` |
| 残日数付与 | POST `/admin/leave-balance/grant` |
| 給与明細 作成・編集・削除 | `/hr/payroll/admin/*` |
| 会社規定 作成・編集・削除 | `/rules/new` / `/rules/edit/:id` |
| 入社前テスト全件閲覧 | GET `/admin/pretests` |
| 目標バッチ操作 | GET/POST `/goals/admin-fix*` |

---

## 7. セッション設定

| 項目 | 値 |
|------|-----|
| secret | `SESSION_SECRET` 環境変数（未設定時は固定文字列） |
| resave | false |
| saveUninitialized | false |
| cookie.secure | false（HTTP 対応） |
| cookie.maxAge | 24時間（86,400,000ms） |
| ストア | デフォルトメモリストア（本番ではRedis等推奨） |

### セッションデータ一覧

| キー | 型 | 内容 |
|------|-----|------|
| `userId` | ObjectId | User の _id |
| `username` | String | ユーザー名 |
| `isAdmin` | Boolean | 管理者フラグ |
| `employee` | Object | Employee オブジェクト（キャッシュ） |

---

## 8. デフォルト管理者

server.js 起動時に `createAdminUser()` が自動実行される。

| 項目 | 値 |
|------|-----|
| username | `admin` |
| password | `admin1234` |
| isAdmin | `true` |

> ⚠️ 本番環境では起動後すぐにパスワードを変更してください。
