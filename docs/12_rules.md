# 12. 会社規定管理

関連ファイル: `routes/rules.js`（361行）

---

## 1. エンドポイント一覧

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | `/rules` | requireLogin | 規定一覧（カテゴリ別） |
| GET | `/rules/new` | requireLogin + isAdmin | 新規規定作成フォーム |
| POST | `/rules/new` | requireLogin + isAdmin | 規定作成（ファイル添付最大10件） |
| GET | `/rules/edit/:id` | requireLogin + isAdmin | 規定編集フォーム |
| POST | `/rules/edit/:id` | requireLogin + isAdmin | 規定更新 |
| GET | `/rules/download/:ruleId/:filename` | requireLogin | 添付ファイルダウンロード |
| POST | `/rules/delete/:id` | requireLogin + isAdmin | 規定削除（添付ファイルも物理削除） |

---

## 2. 規定一覧の表示

```
GET /rules
  ├── CompanyRule.find().sort({category, order})
  └── カテゴリ別にグループ化して表示
       例: [就業規則] [給与規程] [セキュリティポリシー] ...
```

---

## 3. 規定作成・編集フォーム

| フィールド | 必須 | 説明 |
|-----------|------|------|
| category | ✅ | カテゴリ名 |
| title | ✅ | タイトル |
| content | — | 本文（Markdown 記法可） |
| order | — | 表示順（数値） |
| attachments | — | 添付ファイル（最大10件） |

### Markdown サポート

本文は `renderMarkdownToHtml()` で変換して表示。  
`marked` + `sanitize-html` で XSS 対策済み。

---

## 4. ファイルアップロード設定

| 項目 | 値 |
|------|-----|
| エンジン | Multer（diskStorage） |
| 保存先 | `uploads/rules/` |
| 最大ファイル数 | 10 |
| 最大ファイルサイズ | 20MB |
| 対応形式 | PDF / Word / Excel / PowerPoint / 画像 / テキスト |
| ファイル名 | `{timestamp}-{random6digit}{ext}`（latin1 → UTF-8 変換あり） |

---

## 5. ファイルダウンロード

```
GET /rules/download/:ruleId/:filename
  ├── CompanyRule.findById(ruleId) で存在確認
  ├── attachments 配列で filename を検索
  └── res.download(`uploads/rules/${filename}`, originalName)
```

---

## 6. 規定削除

```
POST /rules/delete/:id
  ├── CompanyRule.findByIdAndDelete(id)
  └── attachments 配列の全ファイルを fs.unlink() で物理削除
        （uploads/rules/{filename}）
```
