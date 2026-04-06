// ==============================
// lib/renderPage.js - 共通サイドバー付きページレンダリング
// ==============================

function renderPage(req, res, title, mainTitle, descriptionHtml = '') {
    const employee = req.session.employee;
    const isAdmin  = !!req.session.isAdmin;
    const currentPath = req.path || '';

    // アクティブ判定ヘルパー
    const active = (path) => currentPath === path || currentPath.startsWith(path + '/') ? 'sb-active' : '';

    res.send(`
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>${title} - ${employee ? employee.name : ''}</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
/* ===== Reset / Base ===== */
*, *::before, *::after { box-sizing: border-box; }
body { margin:0; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#f0f2f5; color:#111; display:flex; min-height:100vh; }

/* ===== Sidebar ===== */
.sidebar {
    width: 240px;
    min-width: 240px;
    background: #0b2540;
    color: #c8d6e8;
    display: flex;
    flex-direction: column;
    padding: 0;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,.1) transparent;
}
.sidebar::-webkit-scrollbar { width:4px; }
.sidebar::-webkit-scrollbar-thumb { background:rgba(255,255,255,.15); border-radius:4px; }

/* ロゴ */
.sb-logo {
    padding: 20px 18px 16px;
    border-bottom: 1px solid rgba(255,255,255,.08);
    display: flex;
    align-items: center;
    gap: 10px;
}
.sb-logo img { height: 48px; object-fit: contain; filter: brightness(0) invert(1); opacity: .9; }

/* ユーザー情報 */
.sb-user {
    padding: 14px 18px;
    border-bottom: 1px solid rgba(255,255,255,.08);
    display: flex;
    align-items: center;
    gap: 10px;
}
.sb-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg,#0b5fff,#7c3aed);
    color: #fff; font-size: 15px; font-weight: 800;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
}
.sb-user-name { font-size: 13px; font-weight: 700; color: #e2eaf4; line-height: 1.2; }
.sb-user-role { font-size: 11px; color: #7a92b0; margin-top: 2px; }

/* セクションラベル */
.sb-section {
    padding: 18px 18px 6px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: #4a6380;
}

/* メニューリンク */
.sb-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 18px;
    margin: 1px 8px;
    border-radius: 8px;
    color: #c8d6e8;
    text-decoration: none;
    font-size: 13.5px;
    font-weight: 500;
    transition: background .15s, color .15s;
}
.sb-link:hover { background: rgba(255,255,255,.07); color: #fff; }
.sb-link.sb-active { background: #0b5fff; color: #fff; font-weight: 700; }
.sb-link .sb-icon {
    width: 28px; height: 28px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; flex-shrink: 0;
    background: rgba(255,255,255,.06);
}
.sb-link.sb-active .sb-icon { background: rgba(255,255,255,.2); }
.sb-link:hover .sb-icon { background: rgba(255,255,255,.1); }

/* サブメニュートグル */
.sb-toggle {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 18px; margin: 1px 8px; border-radius: 8px;
    color: #c8d6e8; font-size: 13.5px; font-weight: 500;
    cursor: pointer; user-select: none;
    transition: background .15s, color .15s;
}
.sb-toggle:hover { background: rgba(255,255,255,.07); color: #fff; }
.sb-toggle .sb-icon { width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;background:rgba(255,255,255,.06); }
.sb-toggle:hover .sb-icon { background: rgba(255,255,255,.1); }
.sb-chevron { margin-left: auto; font-size: 10px; transition: transform .2s; color: #4a6380; }
.sb-toggle.open .sb-chevron { transform: rotate(180deg); }
.sb-submenu { display: none; flex-direction: column; padding: 2px 0 4px 46px; }
.sb-submenu.open { display: flex; }
.sb-submenu a {
    display: flex; align-items: center; gap: 7px;
    padding: 7px 14px; border-radius: 6px; margin: 1px 8px 1px 0;
    color: #94a8be; text-decoration: none; font-size: 13px;
    transition: background .15s, color .15s;
}
.sb-submenu a:hover { background: rgba(255,255,255,.07); color: #e2eaf4; }

/* 管理者ブロック */
.sb-admin-block {
    margin: 8px 8px 4px;
    border-radius: 10px;
    background: rgba(239,68,68,.08);
    border: 1px solid rgba(239,68,68,.18);
    overflow: hidden;
}
.sb-admin-label {
    padding: 8px 14px 4px;
    font-size: 10px; font-weight: 800; letter-spacing: .1em;
    text-transform: uppercase; color: #f87171;
}
.sb-admin-block .sb-link {
    margin: 1px 4px; color: #fca5a5;
}
.sb-admin-block .sb-link:hover { background: rgba(239,68,68,.15); color: #fecaca; }
.sb-admin-block .sb-link.sb-active { background: #ef4444; color: #fff; }
.sb-admin-block .sb-link .sb-icon { background: rgba(239,68,68,.2); }

/* 区切り線 */
.sb-divider { border: none; border-top: 1px solid rgba(255,255,255,.07); margin: 8px 18px; }

/* 下部フッター */
.sb-footer {
    margin-top: auto;
    border-top: 1px solid rgba(255,255,255,.08);
    padding: 8px 0;
}

/* ===== メインエリア ===== */
.main { flex:1; padding:28px 32px; display:flex; flex-direction:column; gap:20px; min-width:0; }

/* カード */
.card { background:white; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,.08); padding:20px; margin-bottom:20px; transition:transform .2s; }
.card:hover { transform:translateY(-2px); }
.card-header { display:flex; justify-content:space-between; align-items:center; font-weight:bold; margin-bottom:10px; }
.status-label { padding:4px 8px; border-radius:6px; font-size:12px; color:white; font-weight:bold; }
.status-draft { background:#6c757d; }
.status-pending1, .status-pending2 { background:#1a73e8; }
.status-approved1 { background:#17a2b8; }
.status-completed { background:#28a745; }
.status-rejected { background:#dc3545; }

/* 進捗バー */
.progress-container { background:#eee; border-radius:6px; overflow:hidden; height:12px; margin-top:5px; }
.progress-bar { height:100%; background:#1a73e8; width:0%; transition:width .5s; border-radius:6px; }

/* ボタン */
.btn { padding:8px 16px; border-radius:8px; text-decoration:none; display:inline-flex; align-items:center; gap:8px; margin-right:8px; margin-top:6px; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.btn-primary { background:linear-gradient(90deg,#0b5fff,#184df2); color:white; box-shadow:0 6px 18px rgba(11,95,255,.08); }
.btn-success { background:#16a34a; color:white; }
.btn-danger { background:#dc3545; color:white; }

/* テーブル操作 */
.table-actions { display:flex; flex-wrap:nowrap; gap:8px; align-items:center; overflow:auto; }
.table-actions .btn { white-space:nowrap; }

/* フォーム */
form label { display:flex; flex-direction:column; margin-bottom:12px; font-weight:500; }
input, select, textarea { padding:8px; border-radius:6px; border:1px solid #ccc; font-size:14px; width:100%; box-sizing:border-box; }

/* 履歴テーブル */
.history-table { width:100%; border-collapse:collapse; background:white; border-radius:8px; overflow:hidden; }
.history-table th { background:#eee; padding:10px; text-align:left; }
.history-table td { padding:10px; border-bottom:1px solid #ccc; }
.history-table tr:last-child td { border-bottom:none; }

/* レスポンシブ */
@media(max-width:768px){ .main { padding:15px; } .sidebar { width:200px; min-width:200px; } }
</style>
</head>
<body>

<!-- ===== サイドバー ===== -->
<div class="sidebar">

    <!-- ロゴ -->
    <div class="sb-logo">
        <img src="/nokori-logo.png" alt="NOKORI" />
    </div>

    <!-- ユーザー情報 -->
    <div class="sb-user">
        <div class="sb-avatar">${employee ? (employee.name||'?').charAt(0) : '?'}</div>
        <div>
            <div class="sb-user-name">${employee ? employee.name : ''}</div>
            <div class="sb-user-role">${isAdmin ? '👑 管理者' : (employee ? (employee.position||employee.department||'社員') : '社員')}</div>
        </div>
    </div>

    <!-- ── メイン ── -->
    <div class="sb-section">メイン</div>
    <a href="/dashboard" class="sb-link ${active('/dashboard')}">
        <span class="sb-icon"><i class="fa-solid fa-house"></i></span>ホーム
    </a>

    <!-- ── 勤怠・業務 ── -->
    <div class="sb-section">勤怠・業務</div>
    <a href="/attendance-main" class="sb-link ${active('/attendance-main')}">
        <span class="sb-icon"><i class="fa-solid fa-business-time"></i></span>勤怠管理
    </a>
    <a href="/hr/daily-report" class="sb-link ${active('/hr/daily-report')}">
        <span class="sb-icon"><i class="fa-solid fa-clipboard-list"></i></span>日報
    </a>
    <a href="/goals" class="sb-link ${active('/goals')}">
        <span class="sb-icon"><i class="fa-solid fa-bullseye"></i></span>目標管理
    </a>

    <!-- ── 人事・給与 ── -->
    <div class="sb-section">人事・給与</div>
    <a href="/hr" class="sb-link ${active('/hr') && !currentPath.startsWith('/hr/payroll') && !currentPath.startsWith('/hr/daily') ? 'sb-active' : ''}">
        <span class="sb-icon"><i class="fa-solid fa-users"></i></span>人事管理
    </a>
    <a href="/hr/payroll" class="sb-link ${active('/hr/payroll')}">
        <span class="sb-icon"><i class="fa-solid fa-yen-sign"></i></span>給与明細
    </a>
    <a href="/leave/apply" class="sb-link ${active('/leave/apply')}">
        <span class="sb-icon"><i class="fa-solid fa-plane-departure"></i></span>休暇申請
    </a>
    <a href="/leave/my-requests" class="sb-link ${active('/leave/my-requests')}">
        <span class="sb-icon"><i class="fa-solid fa-calendar-check"></i></span>休暇履歴
    </a>

    <!-- ── 情報・コミュニケーション ── -->
    <div class="sb-section">情報</div>
    <a href="/board" class="sb-link ${active('/board')}">
        <span class="sb-icon"><i class="fa-solid fa-comments"></i></span>社内掲示板
    </a>
    <a href="/rules" class="sb-link ${active('/rules')}">
        <span class="sb-icon"><i class="fa-solid fa-book"></i></span>会社規定
    </a>

    <!-- ── 教育 ── (サブメニュー) -->
    <div class="sb-section">教育</div>
    <div class="sb-toggle" id="edu-toggle">
        <span class="sb-icon"><i class="fa-solid fa-graduation-cap"></i></span>
        教育コンテンツ
        <i class="fa-solid fa-chevron-down sb-chevron"></i>
    </div>
    <div class="sb-submenu" id="edu-submenu">
        <a href="https://dxpro-edu.web.app/" target="_blank" rel="noopener noreferrer">
            <i class="fa-solid fa-external-link"></i> 教育サイト
        </a>
        ${isAdmin ? `<a href="/admin/pretests"><i class="fa-solid fa-file-lines"></i> テスト一覧</a>` : ''}
    </div>
    <a href="/links" class="sb-link ${active('/links')}">
        <span class="sb-icon"><i class="fa-solid fa-link"></i></span>リンク集
    </a>

    <!-- ── 管理者ブロック ── -->
    ${isAdmin ? `
    <hr class="sb-divider">
    <div class="sb-admin-block">
        <div class="sb-admin-label">🛡 管理者メニュー</div>
        <a href="/admin" class="sb-link ${active('/admin') && currentPath==='/admin' ? 'sb-active':''}">
            <span class="sb-icon"><i class="fa-solid fa-gauge-high"></i></span>管理トップ
        </a>
        <a href="/hr/payroll/admin" class="sb-link ${active('/hr/payroll/admin')}">
            <span class="sb-icon"><i class="fa-solid fa-coins"></i></span>給与管理
        </a>
        <a href="/admin/leave-requests" class="sb-link ${active('/admin/leave-requests')}">
            <span class="sb-icon"><i class="fa-solid fa-check-to-slot"></i></span>休暇承認
        </a>
        <a href="/admin/leave-balance" class="sb-link ${active('/admin/leave-balance')}">
            <span class="sb-icon"><i class="fa-solid fa-gift"></i></span>有給付与
        </a>
        <a href="/hr/add" class="sb-link ${active('/hr/add')}">
            <span class="sb-icon"><i class="fa-solid fa-user-plus"></i></span>社員追加
        </a>
    </div>
    ` : ''}

    <!-- フッター -->
    <div class="sb-footer">
        <a href="/change-password" class="sb-link">
            <span class="sb-icon"><i class="fa-solid fa-key"></i></span>パスワード変更
        </a>
        <a href="/logout" class="sb-link" style="color:#f87171">
            <span class="sb-icon" style="background:rgba(239,68,68,.15)"><i class="fa-solid fa-right-from-bracket"></i></span>ログアウト
        </a>
    </div>
</div>

<!-- ===== メインエリア ===== -->
<div class="main">
${ descriptionHtml && descriptionHtml.trim() ? `
    <div class="page-content">${descriptionHtml}</div>
` : `
    <header style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;">
        <h2 style="margin:0;font-size:28px;color:#0b2540;">${mainTitle}</h2>
    </header>
` }
</div>

<script>
(function(){
    // サブメニュートグル
    function bindToggle(toggleId, submenuId) {
        const tog = document.getElementById(toggleId);
        const sub = document.getElementById(submenuId);
        if (!tog || !sub) return;
        tog.addEventListener('click', function(){
            const isOpen = sub.classList.contains('open');
            sub.classList.toggle('open', !isOpen);
            tog.classList.toggle('open', !isOpen);
        });
    }
    bindToggle('edu-toggle', 'edu-submenu');
})();
</script>
</body>
</html>
    `);
}

module.exports = { renderPage };
