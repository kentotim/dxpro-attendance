// ==============================
// routes/organization.js - 組織図・部署管理・権限管理
// ==============================
'use strict';
const express = require('express');
const router  = express.Router();
const { buildPageShell } = require('../lib/renderPage');
const { Department, Employee, User } = require('../models');

function requireAdmin(req, res, next) {
    if (!req.session || !req.session.isAdmin) return res.redirect('/');
    next();
}
function requireLogin(req, res, next) {
    if (!req.session || !req.session.userId) return res.redirect('/login');
    next();
}

// ─────────────────────────────────────────────────────────────
// GET /organization - 組織図（全員閲覧可）
// ─────────────────────────────────────────────────────────────
router.get('/organization', requireLogin, async (req, res) => {
    const employee = await Employee.findOne({ userId: req.session.userId }).lean();
    const depts    = await Department.find({ isActive: true }).sort({ order: 1 }).lean();
    const employees = await Employee.find().lean();
    const users = await User.find().lean();

    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));

    // 部署ツリー構築
    const deptMap  = Object.fromEntries(depts.map(d => [d._id.toString(), { ...d, children: [], members: [] }]));
    const roots    = [];
    for (const d of depts) {
        if (d.parentId && deptMap[d.parentId.toString()]) {
            deptMap[d.parentId.toString()].children.push(deptMap[d._id.toString()]);
        } else {
            roots.push(deptMap[d._id.toString()]);
        }
    }
    // 社員を部署にひも付け
    for (const emp of employees) {
        const key = emp.departmentId?.toString();
        if (key && deptMap[key]) {
            deptMap[key].members.push(emp);
        }
    }

    const ROLE_LABEL = { admin: '管理者', manager: '部門長', team_leader: 'チームリーダー', employee: '社員' };
    const ROLE_COLOR = { admin: '#7c3aed', manager: '#0f6fff', team_leader: '#0891b2', employee: '#64748b' };

    function renderNode(dept, level = 0) {
        const indent = level * 28;
        const mgr = dept.managerId ? employees.find(e => e._id.toString() === dept.managerId.toString()) : null;
        const memberHtml = dept.members.map(m => {
            const u = userMap[m.userId?.toString()] || {};
            const role = m.orgRole || 'employee';
            return `<div class="org-member">
                <div class="org-avatar" style="background:${ROLE_COLOR[role] || '#64748b'}">${(m.name||'?').charAt(0)}</div>
                <div>
                    <div class="org-member-name">${m.name}</div>
                    <div class="org-member-role">${m.position} <span class="org-role-badge" style="background:${ROLE_COLOR[role]}">${ROLE_LABEL[role]||role}</span></div>
                    ${m.concurrentDepts && m.concurrentDepts.length ? `<div class="org-concurrent">兼務: ${m.concurrentDepts.join('、')}</div>` : ''}
                </div>
            </div>`;
        }).join('');

        return `
        <div class="org-dept-node" style="margin-left:${indent}px">
            <div class="org-dept-header">
                <span class="org-dept-icon">🏢</span>
                <span class="org-dept-name">${dept.name}</span>
                ${dept.code ? `<span class="org-dept-code">${dept.code}</span>` : ''}
                ${mgr ? `<span class="org-dept-mgr">👤 ${mgr.name}</span>` : ''}
                <span class="org-dept-count">${dept.members.length}名</span>
            </div>
            ${memberHtml ? `<div class="org-members">${memberHtml}</div>` : ''}
            ${dept.children.map(c => renderNode(c, level + 1)).join('')}
        </div>`;
    }

    const treeHtml = roots.length ? roots.map(r => renderNode(r)).join('') : `
        <div style="text-align:center;padding:60px;color:#94a3b8">
            <div style="font-size:40px;margin-bottom:12px">🏢</div>
            <div>部署がまだ登録されていません。</div>
            ${req.session.isAdmin ? '<a href="/admin/departments" style="display:inline-block;margin-top:12px;padding:8px 20px;background:#0f6fff;color:#fff;border-radius:8px;text-decoration:none">部署を追加する</a>' : ''}
        </div>`;

    const content = `
    <style>
        .org-wrap { max-width:960px;margin:0 auto;padding:24px 16px }
        .org-hero { background:linear-gradient(135deg,#1e3a8a,#3b82f6);color:#fff;border-radius:14px;padding:22px 28px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center }
        .org-hero h1 { margin:0;font-size:21px }
        .org-dept-node { margin-bottom:6px }
        .org-dept-header { display:flex;align-items:center;gap:8px;background:#1e293b;color:#fff;border-radius:10px;padding:12px 18px;margin-bottom:2px;flex-wrap:wrap }
        .org-dept-name { font-weight:700;font-size:15px }
        .org-dept-code { font-size:11px;background:rgba(255,255,255,.15);padding:2px 8px;border-radius:4px }
        .org-dept-mgr { font-size:12px;color:#93c5fd }
        .org-dept-count { margin-left:auto;font-size:12px;color:#94a3b8 }
        .org-members { display:flex;flex-wrap:wrap;gap:10px;padding:10px 18px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:0 0 10px 10px;margin-bottom:6px }
        .org-member { display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;min-width:180px }
        .org-avatar { width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:15px;flex-shrink:0 }
        .org-member-name { font-weight:600;font-size:13px }
        .org-member-role { font-size:11px;color:#64748b;display:flex;align-items:center;gap:4px }
        .org-role-badge { color:#fff;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700 }
        .org-concurrent { font-size:10px;color:#f59e0b;margin-top:2px }
    </style>
    <div class="org-wrap">
        <div class="org-hero">
            <h1>🏢 組織図</h1>
            ${req.session.isAdmin ? '<a href="/admin/departments" style="padding:8px 18px;background:rgba(255,255,255,.2);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">部署管理</a>' : ''}
        </div>
        ${treeHtml}
    </div>`;

    res.send(buildPageShell({ title: '組織図', currentPath: '/organization', employee, isAdmin: req.session.isAdmin }, content));
});

// ─────────────────────────────────────────────────────────────
// GET /admin/departments - 部署管理（管理者）
// ─────────────────────────────────────────────────────────────
router.get('/admin/departments', requireAdmin, async (req, res) => {
    const employee  = null;
    const depts     = await Department.find().sort({ order: 1 }).lean();
    const employees = await Employee.find().lean();
    const empMap    = Object.fromEntries(employees.map(e => [e._id.toString(), e]));
    const deptMap   = Object.fromEntries(depts.map(d => [d._id.toString(), d]));

    const rows = depts.map(d => {
        const mgr    = d.managerId ? empMap[d.managerId.toString()] : null;
        const parent = d.parentId  ? deptMap[d.parentId.toString()] : null;
        return `<tr>
            <td>${d.name}</td>
            <td>${d.code || '—'}</td>
            <td>${parent ? parent.name : '（ルート）'}</td>
            <td>${mgr ? mgr.name : '—'}</td>
            <td>${d.isActive ? '<span style="color:#16a34a;font-weight:700">有効</span>' : '<span style="color:#94a3b8">無効</span>'}</td>
            <td>
                <button class="dept-edit-btn" onclick='editDept(${JSON.stringify(d)})'>編集</button>
                <button class="dept-del-btn" onclick="deleteDept('${d._id}','${d.name}')">削除</button>
            </td>
        </tr>`;
    }).join('');

    const empOptions = employees.map(e => `<option value="${e._id}">${e.name}（${e.department}）</option>`).join('');
    const deptOptions = ['<option value="">（なし・ルート）</option>', ...depts.map(d => `<option value="${d._id}">${d.name}</option>`)].join('');

    const content = `
    <style>
        .dept-wrap { max-width:900px;margin:0 auto;padding:24px 16px }
        .dept-hero { background:linear-gradient(135deg,#1e293b,#334155);color:#fff;border-radius:14px;padding:20px 28px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center }
        .dept-hero h1 { margin:0;font-size:20px }
        .dept-add-btn { padding:9px 20px;background:#0f6fff;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px }
        table { width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06) }
        th { background:#f8fafc;padding:11px 14px;text-align:left;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0 }
        td { padding:11px 14px;font-size:13px;border-bottom:1px solid #f1f5f9 }
        .dept-edit-btn, .dept-del-btn { padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px;border:none;font-weight:600 }
        .dept-edit-btn { background:#f1f5f9;color:#374151;margin-right:4px }
        .dept-del-btn { background:#fee2e2;color:#b91c1c }
        .dept-modal { position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:center;justify-content:center }
        .dept-modal-box { background:#fff;border-radius:14px;width:min(480px,95vw);overflow:hidden }
        .dept-modal-header { background:#1e293b;color:#fff;padding:16px 20px;font-weight:700;display:flex;justify-content:space-between }
        .dept-modal-body { padding:24px;display:flex;flex-direction:column;gap:14px }
        .dept-label { font-size:13px;font-weight:600;color:#374151;display:flex;flex-direction:column;gap:4px }
        .dept-input { padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px }
        .dept-modal-footer { display:flex;gap:10px;justify-content:flex-end;padding:0 24px 20px }
        .dept-save-btn { padding:9px 22px;background:#0f6fff;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700 }
        .dept-cancel-btn { padding:9px 18px;background:#f1f5f9;border:none;border-radius:8px;cursor:pointer }
    </style>
    <div class="dept-wrap">
        <div class="dept-hero">
            <h1>🏢 部署管理</h1>
            <div style="display:flex;gap:8px">
                <a href="/organization" style="padding:8px 16px;background:rgba(255,255,255,.15);color:#fff;border-radius:8px;text-decoration:none;font-size:13px">組織図を見る</a>
                <button class="dept-add-btn" onclick="openModal(null)">＋ 部署追加</button>
            </div>
        </div>
        <table>
            <thead><tr><th>部署名</th><th>コード</th><th>親部署</th><th>部門長</th><th>状態</th><th>操作</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:24px">部署がありません</td></tr>'}</tbody>
        </table>

        <div class="dept-modal" id="deptModal" style="display:none">
            <div class="dept-modal-box">
                <div class="dept-modal-header">
                    <span id="modalTitle">部署追加</span>
                    <button onclick="closeModal()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer">×</button>
                </div>
                <form class="dept-modal-body" onsubmit="saveDept(event)">
                    <input type="hidden" id="deptId">
                    <label class="dept-label">部署名 <input type="text" id="deptName" class="dept-input" required></label>
                    <label class="dept-label">部署コード <input type="text" id="deptCode" class="dept-input" placeholder="例: DEV, HR"></label>
                    <label class="dept-label">親部署
                        <select id="deptParent" class="dept-input">${deptOptions}</select>
                    </label>
                    <label class="dept-label">部門長
                        <select id="deptManager" class="dept-input"><option value="">（未設定）</option>${empOptions}</select>
                    </label>
                    <label class="dept-label">説明 <input type="text" id="deptDesc" class="dept-input"></label>
                    <label class="dept-label"><input type="checkbox" id="deptActive" checked> 有効</label>
                </form>
                <div class="dept-modal-footer">
                    <button class="dept-save-btn" onclick="saveDept(event)">保存</button>
                    <button class="dept-cancel-btn" onclick="closeModal()">キャンセル</button>
                </div>
            </div>
        </div>
    </div>
    <script>
    function openModal(dept) {
        document.getElementById('modalTitle').textContent = dept ? '部署編集' : '部署追加';
        document.getElementById('deptId').value      = dept ? dept._id : '';
        document.getElementById('deptName').value    = dept ? dept.name : '';
        document.getElementById('deptCode').value    = dept ? (dept.code||'') : '';
        document.getElementById('deptParent').value  = dept && dept.parentId ? dept.parentId : '';
        document.getElementById('deptManager').value = dept && dept.managerId ? dept.managerId : '';
        document.getElementById('deptDesc').value    = dept ? (dept.description||'') : '';
        document.getElementById('deptActive').checked = dept ? dept.isActive : true;
        document.getElementById('deptModal').style.display = 'flex';
    }
    function editDept(dept) { openModal(dept); }
    function closeModal() { document.getElementById('deptModal').style.display = 'none'; }

    async function saveDept(e) {
        if (e) e.preventDefault();
        const id = document.getElementById('deptId').value;
        const body = {
            name:        document.getElementById('deptName').value,
            code:        document.getElementById('deptCode').value,
            parentId:    document.getElementById('deptParent').value || null,
            managerId:   document.getElementById('deptManager').value || null,
            description: document.getElementById('deptDesc').value,
            isActive:    document.getElementById('deptActive').checked
        };
        const url    = id ? '/admin/departments/api/' + id : '/admin/departments/api';
        const method = id ? 'PUT' : 'POST';
        const r = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
        const d = await r.json();
        if (d.ok) location.reload(); else alert('エラー: ' + (d.error || ''));
    }

    async function deleteDept(id, name) {
        if (!confirm('部署「' + name + '」を削除しますか？')) return;
        const r = await fetch('/admin/departments/api/' + id, { method: 'DELETE' });
        const d = await r.json();
        if (d.ok) location.reload(); else alert('エラー: ' + (d.error || ''));
    }

    document.getElementById('deptModal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
    </script>`;

    res.send(buildPageShell({ title: '部署管理', currentPath: '/admin/departments', employee, isAdmin: true }, content));
});

// ─────────────────────────────────────────────────────────────
// Department CRUD API
// ─────────────────────────────────────────────────────────────
router.post('/admin/departments/api', requireAdmin, async (req, res) => {
    try {
        const { name, code, parentId, managerId, description, isActive } = req.body;
        if (!name) return res.status(400).json({ error: '部署名は必須です' });
        const dept = await Department.create({ name, code, parentId: parentId || null, managerId: managerId || null, description, isActive: isActive !== false, order: Date.now() });
        res.json({ ok: true, dept });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.put('/admin/departments/api/:id', requireAdmin, async (req, res) => {
    try {
        const { name, code, parentId, managerId, description, isActive } = req.body;
        await Department.findByIdAndUpdate(req.params.id, { name, code, parentId: parentId || null, managerId: managerId || null, description, isActive });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/admin/departments/api/:id', requireAdmin, async (req, res) => {
    try {
        await Department.findByIdAndDelete(req.params.id);
        // 子部署のparentIdをnullにリセット
        await Department.updateMany({ parentId: req.params.id }, { $set: { parentId: null } });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /admin/organization/roles - 社員ロール・人事異動管理
// ─────────────────────────────────────────────────────────────
router.get('/admin/organization/roles', requireAdmin, async (req, res) => {
    const employee  = null;
    const employees = await Employee.find().lean();
    const users     = await User.find().lean();
    const depts     = await Department.find({ isActive: true }).lean();
    const userMap   = Object.fromEntries(users.map(u => [u._id.toString(), u]));

    const ROLE_LABEL = { admin: '管理者', manager: '部門長', team_leader: 'チームリーダー', employee: '社員' };
    const ROLE_COLOR = { admin: '#7c3aed', manager: '#0f6fff', team_leader: '#0891b2', employee: '#64748b' };
    const deptOptions = depts.map(d => `<option value="${d._id}">${d.name}</option>`).join('');
    const empOptions = employees.map(e => `<option value="${e._id}">${e.name}</option>`).join('');

    const rows = employees.map(emp => {
        const role = emp.orgRole || 'employee';
        const user = userMap[emp.userId?.toString()] || {};
        const reportsToEmp = emp.reportsTo ? employees.find(e => e._id.toString() === emp.reportsTo.toString()) : null;
        return `<tr>
            <td>${emp.name}</td>
            <td>${emp.department}</td>
            <td>${emp.position}</td>
            <td><span style="padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700;background:${ROLE_COLOR[role]};color:#fff">${ROLE_LABEL[role]||role}</span></td>
            <td>${reportsToEmp ? reportsToEmp.name : '—'}</td>
            <td>${emp.concurrentDepts && emp.concurrentDepts.length ? emp.concurrentDepts.join('、') : '—'}</td>
            <td>
                <button class="role-edit-btn" onclick='openRoleModal(${JSON.stringify({ id: emp._id, orgRole: emp.orgRole||'employee', departmentId: emp.departmentId||'', reportsTo: emp.reportsTo||'', concurrentDepts: emp.concurrentDepts||[] })})'>編集</button>
            </td>
        </tr>`;
    }).join('');

    const content = `
    <style>
        .roles-wrap { max-width:1000px;margin:0 auto;padding:24px 16px }
        .roles-hero { background:linear-gradient(135deg,#4c1d95,#7c3aed);color:#fff;border-radius:14px;padding:20px 28px;margin-bottom:24px }
        .roles-hero h1 { margin:0;font-size:20px }
        table { width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06) }
        th { background:#f8fafc;padding:10px 12px;text-align:left;font-size:12px;color:#64748b;border-bottom:1px solid #e2e8f0 }
        td { padding:10px 12px;font-size:13px;border-bottom:1px solid #f1f5f9 }
        .role-edit-btn { padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px;border:none;font-weight:600;background:#f1f5f9;color:#374151 }
        .role-modal { position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:center;justify-content:center }
        .role-modal-box { background:#fff;border-radius:14px;width:min(440px,95vw);overflow:hidden }
        .role-modal-header { background:#4c1d95;color:#fff;padding:16px 20px;font-weight:700;display:flex;justify-content:space-between }
        .role-modal-body { padding:24px;display:flex;flex-direction:column;gap:14px }
        .role-label { font-size:13px;font-weight:600;color:#374151;display:flex;flex-direction:column;gap:4px }
        .role-input { padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px }
        .role-modal-footer { display:flex;gap:10px;justify-content:flex-end;padding:0 24px 20px }
        .role-save-btn { padding:9px 22px;background:#7c3aed;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700 }
        .role-cancel-btn { padding:9px 18px;background:#f1f5f9;border:none;border-radius:8px;cursor:pointer }
    </style>
    <div class="roles-wrap">
        <div class="roles-hero">
            <h1>👥 社員ロール・人事異動管理</h1>
        </div>
        <table>
            <thead><tr><th>氏名</th><th>部署</th><th>役職</th><th>ロール</th><th>上司</th><th>兼務</th><th>操作</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:24px">社員がいません</td></tr>'}</tbody>
        </table>

        <div class="role-modal" id="roleModal" style="display:none">
            <div class="role-modal-box">
                <div class="role-modal-header">
                    <span>ロール・所属変更</span>
                    <button onclick="closeRoleModal()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer">×</button>
                </div>
                <div class="role-modal-body">
                    <input type="hidden" id="roleEmpId">
                    <label class="role-label">ロール
                        <select id="roleSelect" class="role-input">
                            <option value="employee">社員</option>
                            <option value="team_leader">チームリーダー</option>
                            <option value="manager">部門長</option>
                            <option value="admin">管理者</option>
                        </select>
                    </label>
                    <label class="role-label">所属部署
                        <select id="roleDeptSelect" class="role-input"><option value="">（未設定）</option>${deptOptions}</select>
                    </label>
                    <label class="role-label">上司（直属）
                        <select id="roleReportsTo" class="role-input"><option value="">（未設定）</option>${empOptions}</select>
                    </label>
                    <label class="role-label">兼務部署名（カンマ区切り）
                        <input type="text" id="roleConcurrent" class="role-input" placeholder="例: 営業部, マーケティング部">
                    </label>
                </div>
                <div class="role-modal-footer">
                    <button class="role-save-btn" onclick="saveRole()">保存</button>
                    <button class="role-cancel-btn" onclick="closeRoleModal()">キャンセル</button>
                </div>
            </div>
        </div>
    </div>
    <script>
    function openRoleModal(emp) {
        document.getElementById('roleEmpId').value = emp.id;
        document.getElementById('roleSelect').value = emp.orgRole || 'employee';
        document.getElementById('roleDeptSelect').value = emp.departmentId || '';
        document.getElementById('roleReportsTo').value = emp.reportsTo || '';
        document.getElementById('roleConcurrent').value = (emp.concurrentDepts || []).join(', ');
        document.getElementById('roleModal').style.display = 'flex';
    }
    function closeRoleModal() { document.getElementById('roleModal').style.display = 'none'; }

    async function saveRole() {
        const id = document.getElementById('roleEmpId').value;
        const body = {
            orgRole:       document.getElementById('roleSelect').value,
            departmentId:  document.getElementById('roleDeptSelect').value || null,
            reportsTo:     document.getElementById('roleReportsTo').value || null,
            concurrentDepts: document.getElementById('roleConcurrent').value.split(',').map(s=>s.trim()).filter(Boolean)
        };
        const r = await fetch('/admin/organization/api/employee/' + id, {
            method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)
        });
        const d = await r.json();
        if (d.ok) location.reload(); else alert('エラー: ' + (d.error || ''));
    }
    document.getElementById('roleModal').addEventListener('click', function(e){ if(e.target===this) closeRoleModal(); });
    </script>`;

    res.send(buildPageShell({ title: 'ロール・人事異動管理', currentPath: '/admin/organization/roles', employee, isAdmin: true }, content));
});

// ─────────────────────────────────────────────────────────────
// PUT /admin/organization/api/employee/:id - 社員ロール・所属更新
// ─────────────────────────────────────────────────────────────
router.put('/admin/organization/api/employee/:id', requireAdmin, async (req, res) => {
    try {
        const { orgRole, departmentId, reportsTo, concurrentDepts } = req.body;
        const emp = await Employee.findByIdAndUpdate(req.params.id, {
            orgRole, departmentId: departmentId || null,
            reportsTo: reportsTo || null,
            concurrentDepts: concurrentDepts || []
        }, { new: true });
        if (!emp) return res.status(404).json({ error: '社員が見つかりません' });

        // Userモデルのroleも同期
        const VALID = ['admin', 'manager', 'team_leader', 'employee'];
        if (orgRole && VALID.includes(orgRole)) {
            await User.findByIdAndUpdate(emp.userId, {
                role: orgRole,
                isAdmin: orgRole === 'admin'
            });
        }
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/organization/tree - 組織ツリーJSONAPI
// ─────────────────────────────────────────────────────────────
router.get('/api/organization/tree', requireLogin, async (req, res) => {
    try {
        const depts    = await Department.find({ isActive: true }).lean();
        const employees = await Employee.find().lean();
        const deptMap  = Object.fromEntries(depts.map(d => [d._id.toString(), { ...d, children: [], members: [] }]));
        const roots    = [];
        for (const d of depts) {
            if (d.parentId && deptMap[d.parentId.toString()]) {
                deptMap[d.parentId.toString()].children.push(deptMap[d._id.toString()]);
            } else {
                roots.push(deptMap[d._id.toString()]);
            }
        }
        for (const emp of employees) {
            const key = emp.departmentId?.toString();
            if (key && deptMap[key]) deptMap[key].members.push({ name: emp.name, position: emp.position, orgRole: emp.orgRole });
        }
        res.json({ tree: roots });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
