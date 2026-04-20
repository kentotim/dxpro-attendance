// ==============================
// routes/locations.js - GPS承認済み場所管理
// ==============================
const router = require('express').Router();
const { ApprovedLocation } = require('../models');
const { requireLogin } = require('../middleware/auth');
const { buildPageShell, pageFooter } = require('../lib/renderPage');

// 管理者チェック
function requireAdmin(req, res, next) {
    if (!req.session.isAdmin) return res.status(403).send('管理者のみアクセス可能です');
    next();
}

// ────────────────────────────────
// GET /locations - 承認済み場所一覧（管理者）
// ────────────────────────────────
router.get('/locations', requireLogin, requireAdmin, async (req, res) => {
    const locations = await ApprovedLocation.find().sort({ createdAt: -1 });

    const rows = locations.map(loc => `
        <tr>
            <td>${loc.name}</td>
            <td>${loc.latitude.toFixed(6)}</td>
            <td>${loc.longitude.toFixed(6)}</td>
            <td>${loc.radius} m</td>
            <td>
                <span class="badge ${loc.isActive ? 'badge-active' : 'badge-inactive'}">
                    ${loc.isActive ? '有効' : '無効'}
                </span>
            </td>
            <td>
                <button class="btn-edit" onclick="openEdit('${loc._id}','${loc.name}',${loc.latitude},${loc.longitude},${loc.radius},${loc.isActive})">
                    <i class="fa fa-pen"></i> 編集
                </button>
                <button class="btn-del" onclick="deleteLocation('${loc._id}')">
                    <i class="fa fa-trash"></i> 削除
                </button>
            </td>
        </tr>
    `).join('');

    const content = `
<div class="page-header">
    <h2><i class="fa fa-map-marker-alt"></i> GPS承認済み場所管理</h2>
    <button class="btn-primary" onclick="document.getElementById('addModal').style.display='flex'">
        <i class="fa fa-plus"></i> 新規追加
    </button>
</div>

<div class="card">
    <table class="data-table">
        <thead>
            <tr>
                <th>場所名</th><th>緯度</th><th>経度</th><th>許容半径</th><th>状態</th><th>操作</th>
            </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#888">登録なし</td></tr>'}</tbody>
    </table>
</div>

<!-- 地図プレビュー -->
<div class="card" style="margin-top:16px">
    <h3><i class="fa fa-map"></i> 地図で確認</h3>
    <div id="map" style="height:400px;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb"></div>
</div>

<!-- 新規追加モーダル -->
<div id="addModal" class="modal-overlay" style="display:none">
    <div class="modal-box">
        <h3><i class="fa fa-map-pin"></i> 承認済み場所を追加</h3>
        <form id="addForm">
            <label>場所名</label>
            <input type="text" id="addName" placeholder="例：本社, テレワーク可エリア" required>
            <label>緯度</label>
            <input type="number" id="addLat" step="0.000001" placeholder="例：35.681236" required>
            <label>経度</label>
            <input type="number" id="addLng" step="0.000001" placeholder="例：139.767125" required>
            <label>許容半径（メートル）</label>
            <input type="number" id="addRadius" value="200" min="50" max="5000" required>
            <button type="button" class="btn-secondary" onclick="getCurrentLocationForAdd()">
                <i class="fa fa-location-crosshairs"></i> 現在地を取得
            </button>
            <div class="modal-actions">
                <button type="button" class="btn-cancel" onclick="document.getElementById('addModal').style.display='none'">キャンセル</button>
                <button type="button" class="btn-primary" onclick="addLocation()">追加</button>
            </div>
        </form>
    </div>
</div>

<!-- 編集モーダル -->
<div id="editModal" class="modal-overlay" style="display:none">
    <div class="modal-box">
        <h3><i class="fa fa-pen"></i> 場所を編集</h3>
        <input type="hidden" id="editId">
        <label>場所名</label>
        <input type="text" id="editName" required>
        <label>緯度</label>
        <input type="number" id="editLat" step="0.000001" required>
        <label>経度</label>
        <input type="number" id="editLng" step="0.000001" required>
        <label>許容半径（メートル）</label>
        <input type="number" id="editRadius" min="50" max="5000" required>
        <label>
            <input type="checkbox" id="editActive"> 有効
        </label>
        <div class="modal-actions">
            <button type="button" class="btn-cancel" onclick="document.getElementById('editModal').style.display='none'">キャンセル</button>
            <button type="button" class="btn-primary" onclick="updateLocation()">保存</button>
        </div>
    </div>
</div>

<style>
.page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.page-header h2{margin:0;font-size:20px}
.card{background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.data-table{width:100%;border-collapse:collapse}
.data-table th{background:#f8fafc;padding:10px 14px;text-align:left;font-size:13px;color:#64748b;border-bottom:2px solid #e2e8f0}
.data-table td{padding:12px 14px;border-bottom:1px solid #f1f5f9;font-size:14px}
.badge{padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600}
.badge-active{background:#dcfce7;color:#16a34a}
.badge-inactive{background:#fee2e2;color:#dc2626}
.btn-primary{background:#0f6fff;color:#fff;border:none;padding:9px 18px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600}
.btn-secondary{background:#f1f5f9;color:#334155;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:13px;margin-bottom:10px;width:100%}
.btn-edit{background:#e0f2fe;color:#0369a1;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:13px;margin-right:4px}
.btn-del{background:#fee2e2;color:#dc2626;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:13px}
.btn-cancel{background:#f1f5f9;color:#334155;border:none;padding:9px 18px;border-radius:8px;cursor:pointer;font-size:14px}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000}
.modal-box{background:#fff;border-radius:14px;padding:28px;width:420px;max-width:95vw}
.modal-box h3{margin:0 0 20px;font-size:18px}
.modal-box label{display:block;font-size:13px;color:#64748b;margin-bottom:4px;margin-top:12px}
.modal-box input[type=text],.modal-box input[type=number]{width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;box-sizing:border-box}
.modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}
</style>

<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const locations = ${JSON.stringify(locations.map(l => ({
    id: l._id,
    name: l.name,
    lat: l.latitude,
    lng: l.longitude,
    radius: l.radius,
    isActive: l.isActive
})))};

// 地図初期化
const map = L.map('map').setView([35.681236, 139.767125], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

locations.forEach(loc => {
    const color = loc.isActive ? '#0f6fff' : '#94a3b8';
    L.circle([loc.lat, loc.lng], {
        radius: loc.radius, color, fillOpacity: 0.15
    }).addTo(map).bindPopup('<b>' + loc.name + '</b><br>半径 ' + loc.radius + 'm');
    L.marker([loc.lat, loc.lng]).addTo(map)
        .bindTooltip(loc.name, { permanent: true, direction: 'top' });
});

if (locations.length > 0) {
    map.fitBounds(locations.map(l => [l.lat, l.lng]));
}

function getCurrentLocationForAdd() {
    if (!navigator.geolocation) return alert('Geolocationが使用できません');
    navigator.geolocation.getCurrentPosition(pos => {
        document.getElementById('addLat').value = pos.coords.latitude.toFixed(6);
        document.getElementById('addLng').value = pos.coords.longitude.toFixed(6);
    }, () => alert('位置情報の取得に失敗しました'));
}

async function addLocation() {
    const body = {
        name: document.getElementById('addName').value,
        latitude: parseFloat(document.getElementById('addLat').value),
        longitude: parseFloat(document.getElementById('addLng').value),
        radius: parseInt(document.getElementById('addRadius').value)
    };
    if (!body.name || isNaN(body.latitude) || isNaN(body.longitude)) return alert('全項目を入力してください');
    const res = await fetch('/locations/api', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    if (res.ok) location.reload();
    else alert('追加に失敗しました');
}

function openEdit(id, name, lat, lng, radius, isActive) {
    document.getElementById('editId').value = id;
    document.getElementById('editName').value = name;
    document.getElementById('editLat').value = lat;
    document.getElementById('editLng').value = lng;
    document.getElementById('editRadius').value = radius;
    document.getElementById('editActive').checked = isActive;
    document.getElementById('editModal').style.display = 'flex';
}

async function updateLocation() {
    const id = document.getElementById('editId').value;
    const body = {
        name: document.getElementById('editName').value,
        latitude: parseFloat(document.getElementById('editLat').value),
        longitude: parseFloat(document.getElementById('editLng').value),
        radius: parseInt(document.getElementById('editRadius').value),
        isActive: document.getElementById('editActive').checked
    };
    const res = await fetch('/locations/api/' + id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    if (res.ok) location.reload();
    else alert('更新に失敗しました');
}

async function deleteLocation(id) {
    if (!confirm('この場所を削除しますか？')) return;
    const res = await fetch('/locations/api/' + id, { method:'DELETE' });
    if (res.ok) location.reload();
    else alert('削除に失敗しました');
}
</script>
`;

    res.send(buildPageShell({
        title: 'GPS承認済み場所管理',
        currentPath: '/locations',
        employee: req.session.employee,
        isAdmin: !!req.session.isAdmin
    }) + content + pageFooter());
});

// ────────────────────────────────
// POST /locations/api - 追加
// ────────────────────────────────
router.post('/locations/api', requireLogin, requireAdmin, async (req, res) => {
    try {
        const { name, latitude, longitude, radius } = req.body;
        const loc = new ApprovedLocation({ name, latitude, longitude, radius, createdBy: req.session.userId });
        await loc.save();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ────────────────────────────────
// PUT /locations/api/:id - 更新
// ────────────────────────────────
router.put('/locations/api/:id', requireLogin, requireAdmin, async (req, res) => {
    try {
        await ApprovedLocation.findByIdAndUpdate(req.params.id, req.body);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ────────────────────────────────
// DELETE /locations/api/:id - 削除
// ────────────────────────────────
router.delete('/locations/api/:id', requireLogin, requireAdmin, async (req, res) => {
    try {
        await ApprovedLocation.findByIdAndDelete(req.params.id);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ────────────────────────────────
// GET /locations/api/active - アクティブな場所一覧（打刻画面用）
// ────────────────────────────────
router.get('/locations/api/active', requireLogin, async (req, res) => {
    try {
        const locations = await ApprovedLocation.find({ isActive: true }).select('name latitude longitude radius');
        res.json(locations);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
