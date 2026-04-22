#!/usr/bin/env python3
import re

path = '/Users/user/dxpro-attendance/dxpro-attendance/routes/pretest.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. imports: PretestConfig 削除
content = content.replace(
    "const { User, Employee, PretestSubmission, PretestConfig } = require('../models');",
    "const { User, Employee, PretestSubmission } = require('../models');"
)

# 2. sendMail import 削除
content = content.replace(
    "const { sendMail } = require('../config/mailer');\n",
    ""
)

# 3. html-pdf import 削除
content = content.replace(
    "const pdf = require('html-pdf');\n",
    ""
)

# 4. buildReportHtml 関数 + sendPretestReport 関数を削除
# buildReportHtml から sendPretestReport の終わり } まで
start_marker = "// ── 採点レポートHTML生成 ─────────────────────────────"
end_marker = "\nrouter.get('/pretest/answers',"
start_idx = content.find(start_marker)
end_idx = content.find(end_marker)
if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]
    print("Removed buildReportHtml + sendPretestReport")
else:
    print(f"WARN: markers not found start={start_idx} end={end_idx}")

# 5. submit handler の sendPretestReport 呼び出し削除
content = content.replace(
    "        // 採点レポートを非同期で自動送信（エラーでも応答はブロックしない）\n        sendPretestReport(saved.toObject()).catch(e => console.error('[pretest] bg report error', e.message));\n\n",
    ""
)

# 6. 管理者詳細画面のPDF・送信ボタンと<script>ブロックを削除
old_btns = """                    <div style="display:flex;gap:8px;flex-wrap:wrap">
                        <a href="/admin/pretest/${it._id}/report.pdf" target="_blank"
                           class="btn btn-primary" style="font-size:13px;padding:7px 14px">
                            <i class="fa fa-file-pdf"></i> PDFダウンロード
                        </a>
                        <button onclick="sendReport('${it._id}')"
                                class="btn btn-outline-primary" style="font-size:13px;padding:7px 14px">
                            <i class="fa fa-paper-plane"></i> 採用担当にメール送信
                        </button>
                    </div>"""
content = content.replace(old_btns, "")

old_script = """            <script>
            async function sendReport(id) {
                if (!confirm('採用担当にレポートメールを送信しますか？')) return;
                const btn = event.target.closest('button');
                btn.disabled = true; btn.textContent = '送信中...';
                const r = await fetch('/admin/pretest/' + id + '/send-report', { method: 'POST' });
                const d = await r.json();
                if (d.ok) alert('送信しました！');
                else alert('エラー: ' + (d.error || '不明'));
                btn.disabled = false; btn.innerHTML = '<i class="fa fa-paper-plane"></i> 採用担当にメール送信';
            }
            </script>
        `);"""
content = content.replace(old_script, "        `);")

# 7. PDF ルートと send-report ルートを削除
pdf_route_start = "\n// ── 個別テスト結果のPDF出力・手動送信（管理者）──────────"
pdf_route_end = "\n// デバッグ: 最近の入社前テストをJSONで返す（管理者のみ）"
si = content.find(pdf_route_start)
ei = content.find(pdf_route_end)
if si != -1 and ei != -1:
    content = content[:si] + content[ei:]
    print("Removed PDF + send-report routes")
else:
    # fallback: try without the debug comment
    pdf_route_end2 = "\nmodule.exports = router;"
    ei2 = content.rfind(pdf_route_end2)
    if si != -1 and ei2 != -1:
        content = content[:si] + content[ei2:]
        print("Removed PDF + send-report routes (fallback)")
    else:
        print(f"WARN: pdf routes not found si={si} ei={ei}")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()
print(f"Done. Total lines: {len(lines)}")
