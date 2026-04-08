# 11. 入社前テスト・自動採点

関連ファイル: `routes/pretest.js`（1268行）、`lib/helpers.js`

---

## 1. エンドポイント一覧

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | `/pretest` | requireLogin | テストトップ（言語選択） |
| GET | `/pretest/:lang` | requireLogin | テスト本体 |
| GET | `/pretest/answers` | requireLogin | 回答・解説一覧（全言語） |
| GET | `/pretest/answers/:lang` | requireLogin | 特定言語の解説 |
| GET | `/pretest/answers/common` | requireLogin | 共通問題の解説 |
| POST | `/pretest/submit` | requireLogin | 回答送信・自動採点 |
| GET | `/admin/pretests` | isAdmin | 全提出一覧（管理者） |
| GET | `/admin/pretest/:id` | isAdmin | 提出詳細・問題別スコア |

---

## 2. テスト構成

| 言語 | 共通問題 | 言語固有問題 | 合計 |
|------|---------|------------|------|
| Java | Q1〜Q20（面接回答形式） | Q21〜Q40（Java コードレビュー形式） | 40問 |
| Python | Q1〜Q20（面接回答形式） | Q21〜Q40（Python コードレビュー形式） | 40問 |

---

## 3. 採点ロジック（computePretestScore）

関数定義: `lib/helpers.js`

### Q1〜Q20（面接回答形式）

- 自由記述形式
- **キーワードマッチング**で採点
- 1問 = 1点（部分点なし）
- 正解キーワードが回答テキストに含まれるかどうかを判定

### Q21〜Q40（コードレビュー形式）

- コード記述・選択形式
- **正規表現パターン**でマッチング採点
- 1問 = 1点（部分点: 0.5点あり）
- 必須要素と加点要素で配点を分割

### 出力

```javascript
{
  score: 28,               // 合計点（/40）
  total: 40,               // 満点
  perQuestionScores: {     // 問題別スコア
    q1: 1, q2: 0.5, q3: 1, ...
  }
}
```

---

## 4. 提出フロー

```
GET /pretest/:lang
  ├── テスト開始時刻を記録（startedAt）
  └── 問題一覧を表示

POST /pretest/submit
  ├── computePretestScore(answers, lang) で採点
  ├── PretestSubmission.create({
  │     name, email, answers, score, total, lang,
  │     perQuestionScores, startedAt, endedAt, durationSeconds
  │   })
  └── 結果ページ表示（スコア・問題別結果）
```

---

## 5. 管理者閲覧

```
GET /admin/pretests
  └── 全 PretestSubmission を一覧表示（受験者名・スコア・言語・日時）

GET /admin/pretest/:id
  └── 提出詳細（全回答・問題別スコア・所要時間）
```

---

## 6. 解説ページ

| パス | 内容 |
|------|------|
| GET `/pretest/answers` | 全言語の解説一覧 |
| GET `/pretest/answers/common` | Q1〜Q20 共通問題の模範解答 |
| GET `/pretest/answers/java` | Q21〜Q40 Java の模範解答 |
| GET `/pretest/answers/python` | Q21〜Q40 Python の模範解答 |
