# 10. 掲示板

関連ファイル: `routes/board.js`（714行）

---

## 1. エンドポイント一覧

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | `/board` | requireLogin | 投稿一覧 |
| GET | `/board/new` | requireLogin | 新規投稿フォーム |
| POST | `/board` | requireLogin | 投稿作成（添付ファイル最大6件） |
| GET | `/board/:id` | requireLogin | 投稿詳細・コメント |
| GET | `/board/:id/edit` | requireLogin | 編集フォーム |
| POST | `/board/:id/edit` | requireLogin | 投稿更新 |
| POST | `/board/:id/delete` | requireLogin | 投稿削除 |
| POST | `/board/:id/like` | requireLogin | いいね数インクリメント |
| POST | `/board/:id/comment` | requireLogin | コメント投稿 |
| POST | `/board/:id/pin` | requireLogin | ピン留めトグル（管理者のみ） |
| GET | `/links` | requireLogin | 外部リンク集（board.js 内定義） |

---

## 2. 投稿作成フォーム

| フィールド | 必須 | 説明 |
|-----------|------|------|
| title | ✅ | タイトル |
| content | ✅ | 本文（テキスト） |
| tags | — | タグ（カンマ区切り） |
| attachments | — | 添付ファイル（最大6件、Multer） |

---

## 3. 投稿一覧の表示ルール

| ルール | 内容 |
|--------|------|
| ピン留め優先 | `pinned: true` の投稿を先頭に表示 |
| 日付降順 | 最新投稿を上位表示 |
| タグフィルター | タグでフィルタリング可能 |
| 検索 | タイトル・本文のキーワード検索 |

---

## 4. 権限ルール

| 操作 | 実行可能者 |
|------|-----------|
| 投稿 | 全ログインユーザー |
| 編集 | 投稿者 or 管理者 |
| 削除 | 投稿者 or 管理者 |
| ピン留め | 管理者のみ |
| いいね・コメント | 全ログインユーザー |

---

## 5. 投稿詳細の表示データ

| データ | 内容 |
|--------|------|
| 投稿本文 | content（テキスト） |
| 添付ファイル | attachments 配列（ダウンロードリンク） |
| 閲覧数 | アクセスごとに views++ |
| いいね数 | likes カウント |
| コメント一覧 | BoardComment（postId で検索） |
| タグ | tags 配列をバッジ表示 |

---

## 6. ファイルアップロード設定

| 項目 | 値 |
|------|-----|
| エンジン | Multer（memoryStorage） |
| 最大ファイル数 | 6 |
| ファイル保存場所 | uploads/ |
| ファイル名 | `{timestamp}-{random6digit}{ext}` |
