// ==============================
// routes/hr.js - 人事・給与管理
// ==============================
const router = require('express').Router();
const moment = require('moment-timezone');
const pdf = require('html-pdf');
const multer = require('multer');
const path = require('path');
const { User, Employee, Attendance, PayrollSlip, PayrollRun, LeaveRequest, Goal } = require('../models');
const { requireLogin, isAdmin } = require('../middleware/auth');
const { escapeHtml } = require('../lib/helpers');
const { renderPage } = require('../lib/renderPage');

// ファイルアップロード設定
const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, 'uploads/'); },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname) || '';
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
    }
});
const upload = multer({ storage });

router.get('/hr', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const employee = await Employee.findOne({ userId: user._id });
        req.session.user = user;
        req.session.employee = employee;

        // DB-driven KPI values
        const pendingLeaves = await LeaveRequest.countDocuments({ status: 'pending' });
        const teamSize = await Employee.countDocuments();
        const tasksIncomplete = await Goal.countDocuments({ status: { $ne: 'completed' } });
        const payrollPending = await PayrollRun.countDocuments({ locked: false });

        // 今月の残業時間合計（Asia/Tokyo）
        const nowMoment = moment().tz('Asia/Tokyo');
        const startOfMonth = nowMoment.clone().startOf('month').toDate();
        const endOfMonth = nowMoment.clone().endOf('month').toDate();
        const overtimeAgg = await PayrollSlip.aggregate([
            { $match: { createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $group: { _id: null, total: { $sum: '$overtimeHours' } } }
        ]);
        const overtimeHours = (overtimeAgg && overtimeAgg[0] && overtimeAgg[0].total) ? Math.round(overtimeAgg[0].total) : 0;

        renderPage(req, res, '人事管理画面', `${employee.name} さん、こんにちは`, `
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                :root{--bg:#f6f7fb;--card:#ffffff;--muted:#6b7280;--accent:#0b69ff}
                body{font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,'Noto Sans JP',sans-serif;background:var(--bg);color:#0b2430}
                .enterprise-container{max-width:1200px;margin:28px auto;padding:20px}
                .hero{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
                .hero .brand{display:flex;align-items:center;gap:12px}
                .brand img{height:44px}
                .hero .welcome{color:var(--muted);font-size:14px}

                .kpi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-top:14px}
                .kpi{background:var(--card);border-radius:12px;padding:14px;box-shadow:0 10px 28px rgba(11,36,48,0.06);display:flex;align-items:center;gap:12px}
                .kpi .icon{font-size:26px;color:var(--accent);width:46px;height:46px;border-radius:10px;background:linear-gradient(180deg,rgba(11,105,255,0.1),rgba(11,105,255,0.03));display:flex;align-items:center;justify-content:center}
                .kpi .value{font-weight:700;font-size:18px}
                .kpi .label{color:var(--muted);font-size:13px}

                .main-grid{display:grid;grid-template-columns:1fr 320px;gap:20px;margin-top:20px}
                .panel{background:var(--card);border-radius:12px;padding:18px;box-shadow:0 12px 30px rgba(11,36,48,0.05)}

                .table thead th{background:#fafbfd;border-bottom:1px solid #eef2f5}
                .avatar{width:36px;height:36px;border-radius:50%;background:#e6eefc;color:#0b69ff;display:inline-flex;align-items:center;justify-content:center;font-weight:700}

                .filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
                .search{display:flex;gap:8px}

                .actions{display:flex;gap:8px;justify-content:flex-end}

                @media(max-width:1000px){.kpi-grid{grid-template-columns:repeat(2,1fr)}.main-grid{grid-template-columns:1fr}}
            </style>

            <div class="enterprise-container">
                <div class="hero">
                    <div class="brand">
                        <div>
                            <div style="font-size:30px;font-weight:700">人事管理</div>
                            <div class="welcome">${escapeHtml(employee.name)} さん、ようこそ</div>
                        </div>
                    </div>
                    <div class="actions">
                        ${ req.session.user && req.session.user.isAdmin ? `
                        <a href="/hr/add" class="btn btn-outline-primary">社員を追加</a>
                        <a href="/hr/statistics" class="btn btn-primary">統計を見る</a>
                        ` : `` }
                    </div>
                </div>

                <div class="kpi-grid">
                    <div class="kpi"><div class="icon"><i class="fa-solid fa-clock"></i></div><div><div class="value">${escapeHtml(String(overtimeHours))}h</div><div class="label">今月残業</div></div></div>
                    <div class="kpi"><div class="icon"><i class="fa-solid fa-plane-departure"></i></div><div><div class="value">${escapeHtml(String(pendingLeaves))}</div><div class="label">未承認休暇</div></div></div>
                    <div class="kpi"><div class="icon"><i class="fa-solid fa-users"></i></div><div><div class="value">${escapeHtml(String(teamSize))}名</div><div class="label">チーム人数</div></div></div>
                    <div class="kpi"><div class="icon"><i class="fa-solid fa-tasks"></i></div><div><div class="value">${escapeHtml(String(tasksIncomplete))}</div><div class="label">未完了タスク</div></div></div>
                    <div class="kpi"><div class="icon"><i class="fa-solid fa-yen-sign"></i></div><div><div class="value">${escapeHtml(String(payrollPending))}</div><div class="label">未処理給与</div></div></div>
                </div>

                <div class="main-grid">
                    <div class="panel">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h5 class="mb-0">社員一覧</h5>
                            <div class="text-muted small">従業員ID: ${escapeHtml(employee.employeeId)} ｜ 部署: ${escapeHtml(employee.department || '-')}</div>
                        </div>

                        ${ req.session.user && req.session.user.isAdmin ? `
                        <div class="filters">
                        <div style="overflow:auto;max-height:560px">
                            <table class="table table-hover">
                                <thead>
                                    <tr><th></th><th>名前</th><th>社員ID</th><th>部署</th><th>役職</th><th>入社日</th><th>有給</th><th>操作</th></tr>
                                </thead>
                                <tbody id="hrTableBody">
                                    ${ (await Employee.find().limit(50)).map(e=>`
                                        <tr>
                                            <td><div class="avatar">${escapeHtml((e.name||'').slice(0,2))}</div></td>
                                            <td>${escapeHtml(e.name)}</td>
                                            <td>${escapeHtml(e.employeeId || '')}</td>
                                            <td>${escapeHtml(e.department || '')}</td>
                                            <td>${escapeHtml(e.position || '')}</td>
                                            <td>${e.joinDate ? escapeHtml(moment.tz(e.joinDate,'Asia/Tokyo').format('YYYY-MM-DD')) : '-'}</td>
                                            <td>${escapeHtml(String(e.paidLeave || 0))}</td>
                                            <td><a href="/hr/edit/${e._id}" class="btn btn-sm btn-outline-primary">編集</a> <a href="/hr/delete/${e._id}" class="btn btn-sm btn-outline-danger">削除</a></td>
                                        </tr>
                                    `).join('') }
                                </tbody>
                            </table>
                        </div>
                        ` : `
                        <div class="alert alert-info">社員一覧は管理者のみ閲覧できます。</div>
                        <div style="margin-top:10px;padding:10px;border:1px solid rgba(0,0,0,0.04);border-radius:8px;background:#fbfdff">
                            <div style="font-weight:700">あなたの情報</div>
                            <div class="small-muted">${escapeHtml(employee.name)} ｜ ${escapeHtml(employee.employeeId || '-') } ｜ ${escapeHtml(employee.department || '-')}</div>
                        </div>
                        ` }
                    </div>

                    ${ req.session.user && req.session.user.isAdmin ? `
                    <div class="panel">
                        <h6>クイックアクション</h6>
                        <div class="mt-3 d-grid gap-2">
                            <a href="/hr/add" class="btn btn-primary">新規社員登録</a>
                            <a href="/hr/statistics" class="btn btn-outline-secondary">部署統計を見る</a>
                            <a href="/leave/apply" class="btn btn-outline-secondary">休暇申請確認</a>
                        </div>

                        <h6 class="mt-4">最近の休暇申請</h6>
                        <ul class="list-group list-group-flush mt-2">
                            <li class="list-group-item">山田 太郎 — 2025-09-05 <span class="badge bg-warning float-end">申請中</span></li>
                            <li class="list-group-item">鈴木 花子 — 2025-09-10 <span class="badge bg-success float-end">承認済</span></li>
                            <li class="list-group-item">佐藤 次郎 — 2025-09-12 <span class="badge bg-warning float-end">申請中</span></li>
                        </ul>

                        <h6 class="mt-4">残業時間推移</h6>
                        <canvas id="overtimeChart" style="max-width:100%;margin-top:8px"></canvas>
                        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                        <script>
                            const ctx = document.getElementById('overtimeChart').getContext('2d');
                            new Chart(ctx, {
                                type: 'line',
                                data: { labels:['1日','2日','3日','4日','5日','6日','7日'], datasets:[{ label:'残業時間', data:[1,2,1.5,2,1,3,2], borderColor:'#0b69ff', backgroundColor:'rgba(11,105,255,0.08)', tension:0.3 }]},
                                options:{responsive:true,plugins:{legend:{display:false}}}
                            });
                        </script>
                    </div>
                    ` : `
                    <div class="panel">
                        <div class="alert alert-info">クイックアクション、最近の休暇申請、残業時間推移は管理者のみ閲覧できます。</div>
                    </div>
                    ` }
                </div>
            </div>
        `);

    } catch (error) {
        console.error(error);
        res.status(500).send('サーバーエラー');
    }
});

// 社員追加
router.get('/hr/add', requireLogin, (req, res) => {
    const html = `
        <form action="/hr/add" method="POST">
            <label>氏名: <input name="name" required></label><br>
            <label>部署: <input name="department" required></label><br>
            <label>役職: <input name="position" required></label><br>
            <label>入社日: <input type="date" name="joinDate" required></label><br>
            <label>メール: <input type="email" name="email"></label><br>
            <button type="submit">追加</button>
        </form>
    `;
    renderPage(req, res, '社員追加', '新しい社員を追加', html);
});

router.post('/hr/add', requireLogin, async (req, res) => {
    const { name, department, position, joinDate, email } = req.body;
    await Employee.create({ name, department, position, joinDate, email, paidLeave: 10 });
    res.redirect('/hr');
});

// 社員編集
router.get('/hr/edit/:id', requireLogin, async (req, res) => {
    const id = req.params.id;
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.redirect('/hr');

    const html = `
        <form action="/hr/edit/${id}" method="POST">
            <label>氏名: <input name="name" value="${employee.name}" required></label><br>
            <label>部署: <input name="department" value="${employee.department}" required></label><br>
            <label>役職: <input name="position" value="${employee.position}" required></label><br>
            <label>入社日: <input type="date" name="joinDate" value="${employee.joinDate}" required></label><br>
            <label>メール: <input type="email" name="email" value="${employee.email || ''}"></label><br>
            <label>有給残日数: <input type="number" name="paidLeave" value="${employee.paidLeave || 0}"></label><br>
            <button type="submit">更新</button>
        </form>
    `;
    renderPage(req, res, '社員編集', '社員情報を編集', html);
});

router.post('/hr/edit/:id', requireLogin, async (req, res) => {
    const id = req.params.id;
    const { name, department, position, joinDate, email, paidLeave } = req.body;
    await db.collection('employees').updateOne(
        { _id: ObjectId(id) },
        { $set: { name, department, position, joinDate, email, paidLeave: Number(paidLeave) } }
    );
    res.redirect('/hr');
});

// 社員削除
router.get('/hr/delete/:id', requireLogin, async (req, res) => {
    await Employee.findByIdAndDelete(req.params.id);
    res.redirect('/hr');
});

// 統計
router.get('/hr/statistics', requireLogin, async (req, res) => {
    const employees = await Employee.find();
    const deptCount = {};
    const posCount = {};
    employees.forEach(e => {
        deptCount[e.department] = (deptCount[e.department] || 0) + 1;
        posCount[e.position] = (posCount[e.position] || 0) + 1;
    });

    const html = `
        <h3>部署別人数</h3>
        <ul>${Object.entries(deptCount).map(([k,v]) => `<li>${k}: ${v}名</li>`).join('')}</ul>
        <h3>役職別人数</h3>
        <ul>${Object.entries(posCount).map(([k,v]) => `<li>${k}: ${v}名</li>`).join('')}</ul>
        <a href="/hr">社員一覧に戻る</a>
    `;
    renderPage(req, res, '統計', '部署・役職統計', html);
});

// 有給更新
router.post('/hr/leave/:id', requireLogin, async (req, res) => {
    const { remainingDays } = req.body;
    await Employee.findByIdAndUpdate(req.params.id, { paidLeave: Number(remainingDays) });
    res.redirect('/hr');
});

// CSVエクスポート
router.get('/hr/export', requireLogin, async (req, res) => {
    const employees = await Employee.find();
    const csv = [
        ['氏名','部署','役職','入社日','メール','有給残日数'],
        ...employees.map(e => [e.name, e.department, e.position, e.joinDate, e.email, e.paidLeave || 0])
    ].map(r => r.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="employees.csv"');
    res.send(csv);
});

// 社員写真アップロード
router.post('/hr/photo/:id', requireLogin, upload.single('photo'), async (req, res) => {
    const filename = req.file.filename;
    await Employee.findByIdAndUpdate(req.params.id, { photo: filename });
    res.redirect('/hr');
});




// 給与管理メイン（管理者用）
router.get('/hr/payroll/admin', requireLogin, async (req, res) => {
    if (!req.session.user?.isAdmin) return res.redirect('/hr/payroll');

    const employees = await Employee.find();

    const html = `
        <div class="container mt-4">
            <h4>管理者用給与管理</h4>

            <a href="/hr/payroll/admin/new" class="btn btn-success mb-3">新しい給与を登録</a>

            <!-- 社員カード一覧 -->
            <div class="row g-3 mt-3">
                ${employees.map(emp => `
                    <div class="col-md-3">
                        <div class="card shadow-sm text-center p-3">
                            <h5>${emp.name}</h5>
                            <p>${emp.department} / ${emp.position}</p>
                            <a href="/hr/payroll/${emp._id}" class="btn btn-primary mt-2">給与明細</a>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    renderPage(req, res, "給与管理", "管理者メニュー", html);
});

router.post('/hr/payroll/admin/add', requireLogin, async (req, res) => {
    if (!req.session.user?.isAdmin) return res.status(403).send('アクセス権限がありません');

    const { employeeId, payMonth } = req.body;

    // payMonthは "YYYY-MM" 形式のバリデーション
    if (!payMonth || !/^\d{4}-\d{2}$/.test(payMonth)) {
        return res.status(400).send('対象月が正しくありません');
    }

    const [yearStr, monthStr] = payMonth.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);

    if (isNaN(year) || isNaN(month)) {
        return res.status(400).send('対象月が無効です');
    }

    // 月初・月末
    const periodFrom = new Date(year, month - 1, 1);
    const periodTo = new Date(year, month, 0);

    // 4月始まりの年度計算
    const fiscalYear = (month >= 4) ? year : year - 1;

    // PayrollRun 作成
    const payrollRun = await PayrollRun.create({
        periodFrom,
        periodTo,
        fiscalYear,
        createdBy: req.session.user._id, // session.employee ではなく user._id
    });

    // PayrollSlip 作成
    await PayrollSlip.create({
        employeeId,
        runId: payrollRun._id,
        workDays: Number(req.body.workDays || 0),
        absentDays: Number(req.body.absentDays || 0),
        lateCount: Number(req.body.lateCount || 0),
        earlyLeaveCount: Number(req.body.earlyLeaveCount || 0),
        overtimeHours: Number(req.body.overtimeHours || 0),
        nightHours: Number(req.body.nightHours || 0),
        holidayHours: Number(req.body.holidayHours || 0),
        holidayNightHours: Number(req.body.holidayNightHours || 0),
        baseSalary: Number(req.body.baseSalary || 0),
        gross: Number(req.body.gross || 0),
        net: Number(req.body.net || 0),
        status: req.body.status || 'draft',

        // 手当
        allowances: Object.entries(req.body.allowances || {}).map(([name, amount]) => ({
            name,
            amount: Number(amount)
        })),

        // 控除
        deductions: Object.entries(req.body.deductions || {}).map(([name, amount]) => ({
            name,
            amount: Number(amount)
        })),

        // 所得税
        incomeTax: Number(req.body.incomeTax || 0),

        // 通勤費
        commute: {
            nonTax: Number(req.body.commute?.nonTax || 0),
            tax: Number(req.body.commute?.tax || 0)
        }
    });

    res.redirect('/hr/payroll/admin');
});

router.get('/hr/payroll/admin/new', requireLogin, async (req, res) => {
    if (!req.session.user?.isAdmin) return res.redirect('/hr/payroll');

    const employees = await Employee.find();

    const html = `
        <div class="container mt-4">
            <h4>新しい給与を登録</h4>

            <form action="/hr/payroll/admin/add" method="POST">
                <label>対象月:
                    <input type="month" name="payMonth" required>
                </label><br><br>

                <label>社員:
                    <select name="employeeId" required>
                        ${employees.map(emp => `<option value="${emp._id}">${emp.name}</option>`).join('')}
                    </select>
                </label><br><br>

                <label>勤務日数: <input type="number" name="workDays" required></label><br>
                <label>欠勤日数: <input type="number" name="absentDays" required></label><br>
                <label>遅刻回数: <input type="number" name="lateCount" required></label><br>
                <label>早退回数: <input type="number" name="earlyLeaveCount" required></label><br>
                <label>時間外: <input type="number" name="overtimeHours" required></label><br>
                <label>深夜時間: <input type="number" name="nightHours" required></label><br>
                <label>休日時間: <input type="number" name="holidayHours" required></label><br>
                <label>休日深夜: <input type="number" name="holidayNightHours" required></label><br><br>

                <h5>手当</h5>
                <label>役職手当: <input type="number" name="allowances[役職手当]" value="0"></label>
                <label>家族手当: <input type="number" name="allowances[家族手当]" value="0"></label>
                <label>手当-1: <input type="number" name="allowances[手当-1]" value="0"></label>
                <label>手当-2: <input type="number" name="allowances[手当-2]" value="0"></label>
                <!-- 必要に応じて手当-10まで -->

                <h5>控除</h5>
                <label>健康保険: <input type="number" name="deductions[健康保険]" value="0"></label>
                <label>厚生年金: <input type="number" name="deductions[厚生年金]" value="0"></label>
                <label>雇用保険: <input type="number" name="deductions[雇用保険]" value="0"></label>
                <!-- 必要に応じて控除-10まで -->
                <label>所得税: <input type="number" name="incomeTax" required></label><br>

                <h5>通勤費</h5>
                <label>非課税: <input type="number" name="commute[nonTax]" value="0"></label>
                <label>課税: <input type="number" name="commute[tax]" value="0"></label>
                
                <label>基本給: <input type="number" name="baseSalary" required></label><br>
                <label>総支給: <input type="number" name="gross" required></label><br>
                <label>差引支給: <input type="number" name="net" required></label><br><br>

                <label>ステータス:
                    <select name="status">
                        <option value="draft">下書き</option>
                        <option value="issued">発行済み</option>
                        <option value="paid">支払済み</option>
                    </select>
                </label><br><br>

                <button type="submit" class="btn btn-success">登録</button>
                <a href="/hr/payroll/admin" class="btn btn-secondary ms-2">戻る</a>
            </form>
        </div>
    `;
    renderPage(req, res, "給与管理", "新規給与登録", html);
});

// 管理者用 給与明細編集画面
router.get('/hr/payroll/admin/edit/:slipId', requireLogin, async (req, res) => {
    if (!req.session.user?.isAdmin) return res.status(403).send('アクセス権限がありません');

    const slip = await PayrollSlip.findById(req.params.slipId).populate('employeeId runId');
    if (!slip) return res.status(404).send('給与明細が見つかりません');

    const html = `
        <div class="container mt-4">
            <h4>${slip.employeeId.name} の給与明細を編集 (${slip.runId?.periodFrom.getFullYear()}年${slip.runId?.periodFrom.getMonth() + 1}月)</h4>

            <form action="/hr/payroll/admin/edit/${slip._id}" method="POST">
                <label>基本給: <input type="number" name="baseSalary" value="${slip.baseSalary}" required></label><br>
                <label>総支給: <input type="number" name="gross" value="${slip.gross}" required></label><br>
                <label>差引支給: <input type="number" name="net" value="${slip.net}" required></label><br><br>

                <h5>手当</h5>
                ${slip.allowances.map(a => `
                    <label>${a.name}: <input type="number" name="allowances[${a.name}]" value="${a.amount}"></label><br>
                `).join('')}

                <h5>控除</h5>
                ${slip.deductions.map(d => `
                    <label>${d.name}: <input type="number" name="deductions[${d.name}]" value="${d.amount}"></label><br>
                `).join('')}
                <label>所得税: <input type="number" name="incomeTax" value="${slip.incomeTax}"></label><br><br>

                <h5>通勤費</h5>
                <label>非課税: <input type="number" name="commute[nonTax]" value="${slip.commute?.nonTax || 0}"></label><br>
                <label>課税: <input type="number" name="commute[tax]" value="${slip.commute?.tax || 0}"></label><br><br>

                <label>ステータス:
                    <select name="status">
                        <option value="draft" ${slip.status === 'draft' ? 'selected' : ''}>下書き</option>
                        <option value="issued" ${slip.status === 'issued' ? 'selected' : ''}>発行済み</option>
                        <option value="locked" ${slip.status === 'locked' ? 'selected' : ''}>確定</option>
                    </select>
                </label><br><br>

                <button type="submit" class="btn btn-primary">保存</button>
                <a href="/hr/payroll/${slip.employeeId._id}" class="btn btn-secondary ms-2">戻る</a>
            </form>
        </div>
    `;
    renderPage(req, res, "給与管理", "給与明細編集", html);
});

// 管理者用 給与明細更新
router.post('/hr/payroll/admin/edit/:slipId', requireLogin, async (req, res) => {
    if (!req.session.user?.isAdmin) return res.status(403).send('アクセス権限がありません');

    const slip = await PayrollSlip.findById(req.params.slipId).populate('employeeId');
    if (!slip) return res.status(404).send('給与明細が見つかりません');

    // 管理者は「locked でも修正OK」
    slip.baseSalary = Number(req.body.baseSalary || 0);
    slip.gross = Number(req.body.gross || 0);
    slip.net = Number(req.body.net || 0);
    slip.status = req.body.status || slip.status;

    slip.allowances = Object.entries(req.body.allowances || {}).map(([name, amount]) => ({
        name,
        amount: Number(amount)
    }));

    slip.deductions = Object.entries(req.body.deductions || {}).map(([name, amount]) => ({
        name,
        amount: Number(amount)
    }));

    slip.incomeTax = Number(req.body.incomeTax || 0);
    slip.commute = {
        nonTax: Number(req.body.commute?.nonTax || 0),
        tax: Number(req.body.commute?.tax || 0)
    };

    await slip.save();
    res.redirect(`/hr/payroll/${slip.employeeId._id}`);
});

router.get('/hr/payroll', requireLogin, async (req, res) => {
    const employee = await Employee.findOne({ userId: req.session.user._id });
    req.session.employee = employee;

    const isAdmin = req.session.user?.isAdmin;

    // 直近6件の給与明細を取得
    const slips = await PayrollSlip.find({ employeeId: employee._id })
        .populate('runId')
        .sort({ 'runId.periodFrom': -1 })
        .limit(6);

    // グラフ用データ（降順で出るので reverse）
    const chartLabels = slips.map(s => 
        `${s.runId.periodFrom.getFullYear()}/${s.runId.periodFrom.getMonth() + 1}`
    ).reverse();
    const chartData = slips.map(s => s.net || 0).reverse();

    // 管理者用サマリ
    let summary = null;
    if (isAdmin) {
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const runs = await PayrollRun.find({
            periodFrom: { $gte: from, $lte: to }
        }).distinct('_id');
        const allSlips = await PayrollSlip.find({ runId: { $in: runs } });
        const totalGross = allSlips.reduce((sum, s) => sum + (s.gross || 0), 0);
        const totalNet = allSlips.reduce((sum, s) => sum + (s.net || 0), 0);
        summary = { totalGross, totalNet, count: allSlips.length };
    }

    const html = `
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            body{font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,'Noto Sans JP',sans-serif}
            .container{max-width:1100px;margin:28px auto}
            .hero{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
            .hero h2{margin:0;font-weight:700}
            .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px}
            .kpi{background:#fff;border-radius:10px;padding:12px;box-shadow:0 10px 30px rgba(10,20,40,0.06);border:1px solid rgba(0,0,0,0.04);display:flex;justify-content:space-between;align-items:center}
            .kpi .meta{color:#6b7280;font-size:13px}
            .kpi .value{font-weight:700;font-size:18px}
            .main-grid{display:grid;grid-template-columns:1fr 360px;gap:18px}
            .panel{background:#fff;padding:14px;border-radius:10px;box-shadow:0 10px 24px rgba(10,20,40,0.05)}
            .small-muted{color:#6b7280;font-size:13px}
            @media(max-width:1000px){.main-grid{grid-template-columns:1fr}}
        </style>

        <div class="container">
            <div class="hero">
                <div>
                    <h2>給与管理</h2>
                    <div class="small-muted">${escapeHtml(employee.name)} さんの給与ダッシュボード</div>
                </div>
                <div>
                    ${ isAdmin ? `<a href="/hr/payroll/admin" class="btn btn-warning me-2">管理者メニュー</a>` : '' }
                    <a href="/hr" class="btn btn-outline-secondary">人事一覧へ戻る</a>
                </div>
            </div>

            <div class="kpi-grid">
                <div class="kpi">
                    <div>
                        <div class="meta">最新の差引支給</div>
                        <div class="value">${slips.length ? '¥' + slips[0].net.toLocaleString() : '—'}</div>
                    </div>
                    <div class="small-muted">${slips.length ? `${slips[0].runId.periodFrom.getFullYear()}年${slips[0].runId.periodFrom.getMonth()+1}月` : ''}</div>
                </div>

                <div class="kpi">
                    <div>
                        <div class="meta">直近明細数</div>
                        <div class="value">${slips.length}</div>
                    </div>
                    <div class="small-muted">最新6件を表示</div>
                </div>

                <div class="kpi">
                    <div>
                        <div class="meta">あなたの累計手取り</div>
                        <div class="value">¥${(slips.reduce((s,x)=>s+(x.net||0),0)).toLocaleString()}</div>
                    </div>
                    <div class="small-muted">期間内合計</div>
                </div>
            </div>

            <div class="main-grid">
                <div>
                    <div class="panel mb-3">
                        <h5 class="mb-2">最新の給与明細</h5>
                        ${slips.length ? `
                            <div style="display:flex;gap:14px;align-items:center">
                                <div style="width:64px;height:64px;border-radius:8px;background:linear-gradient(180deg,#eef6ff,#e8f1ff);display:flex;align-items:center;justify-content:center;font-weight:700">${escapeHtml((employee.name||'').slice(0,2))}</div>
                                <div>
                                    <div style="font-weight:700">${slips[0].runId.periodFrom.getFullYear()}年${slips[0].runId.periodFrom.getMonth()+1}月分</div>
                                    <div class="small-muted">基本給: ¥${slips[0].baseSalary.toLocaleString()} / 総支給: ¥${slips[0].gross.toLocaleString()}</div>
                                    <div style="margin-top:8px;font-size:18px;color:#0b853a">差引支給: ¥${slips[0].net.toLocaleString()}</div>
                                </div>
                            </div>
                            <div style="margin-top:12px"><a href="/hr/payroll/${employee._id}" class="btn btn-outline-primary btn-sm">詳細を見る</a></div>
                        ` : `<p class="text-muted">まだ給与明細が登録されていません。</p>`}
                    </div>

                    <div class="panel">
                        <h5 class="mb-2">最近の給与履歴</h5>
                        ${slips.length ? `
                            <ul class="list-group list-group-flush">
                                ${slips.map(s => `
                                    <li class="list-group-item d-flex justify-content-between">
                                        <div>${s.runId.periodFrom.getFullYear()}年${s.runId.periodFrom.getMonth()+1}月</div>
                                        <div>¥${s.net.toLocaleString()}</div>
                                    </li>
                                `).join('')}
                            </ul>
                        ` : `<p class="text-muted">履歴はありません</p>`}
                    </div>
                </div>

                <div>
                    <div class="panel mb-3">
                        <h6 class="mb-2">給与推移（手取り）</h6>
                        <canvas id="salaryChart" style="width:100%;height:200px"></canvas>
                    </div>

                    ${isAdmin && summary ? `
                        <div class="panel">
                            <h6 class="mb-2">管理者サマリ</h6>
                            <div class="small-muted">今月の発行済み給与明細数: <strong>${summary.count}</strong></div>
                            <div class="small-muted">総支給額合計: <strong>¥${summary.totalGross.toLocaleString()}</strong></div>
                            <div class="small-muted">手取り合計: <strong>¥${summary.totalNet.toLocaleString()}</strong></div>
                            <div style="margin-top:10px"><a href="/hr/payroll/admin" class="btn btn-warning btn-sm">管理者メニューへ</a></div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <script>
                const ctx = document.getElementById('salaryChart').getContext('2d');
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ${JSON.stringify(chartLabels)},
                        datasets: [{ label: '差引支給額 (¥)', data: ${JSON.stringify(chartData)}, backgroundColor: 'linear-gradient(180deg, #36a2eb, #2b8bd6)'.replace(/linear-gradient\([^)]*\)/,'rgba(54,162,235,0.6)') }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: { y: { ticks: { callback: value => '¥' + value.toLocaleString() } } }
                    }
                });
            </script>
        </div>
    `;

    renderPage(req, res, "給与管理", "給与管理ダッシュボード", html);
});

router.get('/hr/payroll/:id', requireLogin, async (req, res) => {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.redirect('/hr/payroll');

    // 権限チェック
    if (employee.userId.toString() !== req.session.user._id.toString() && !req.session.user?.isAdmin) {
        return res.status(403).send('アクセス権限がありません');
    }

    // 月別検索
    const { payMonth } = req.query; // YYYY-MM
    let runIds = [];
    if (payMonth) {
        const [year, month] = payMonth.split('-').map(Number);
        const from = new Date(year, month - 1, 1); // その月の初日
        const to = new Date(year, month, 0);       // その月の末日

        // その月に開始した PayrollRun を取得
        runIds = await PayrollRun.find({
            periodFrom: { $gte: from, $lte: to }
        }).distinct('_id');
    }

    // slip を取得（検索条件がある場合は runId を限定する）
    const slips = await PayrollSlip.find({
        employeeId: employee._id,
        ...(payMonth ? { runId: { $in: runIds } } : {})
    }).populate('runId').sort({ 'runId.periodFrom': -1 });

    const statusMap = {
        draft: "下書き",
        issued: "発行済み",
        locked: "確定"
    };

    // HTML 出力
    const html = `
        <div class="container py-4">
            <h3 class="mb-4">${employee.name} の給与明細</h3>

            <!-- 月別検索 -->
            <form method="GET" action="/hr/payroll/${employee._id}" class="mb-4 row g-2 align-items-center">
                <div class="col-auto">
                    <label class="col-form-label">対象月</label>
                </div>
                <div class="col-auto">
                    <input type="month" name="payMonth" value="${payMonth || ''}" class="form-control" placeholder="YYYY-MM">
                </div>
                <div class="col-auto">
                    <button type="submit" class="btn btn-primary">検索</button>
                    <a href="/hr/payroll/${employee._id}/export${payMonth ? '?payMonth=' + payMonth : ''}" class="btn btn-success mb-4">CSVダウンロード</a>
                    <a href="/hr/payroll/${employee._id}" class="btn btn-primary">クリア</a>
                </div>
            </form><br>

            ${slips.length ? slips.map(s => `
                <div class="card mb-4 shadow-sm border-0 rounded-3 overflow-hidden">
                    <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <span><strong>
                            ${s.runId?.periodFrom
                                ? `${s.runId.periodFrom.getFullYear()}年${s.runId.periodFrom.getMonth() + 1}月分`
                                : '-'}
                        </strong></span>
                        <span class="badge bg-light text-primary">${statusMap[s.status] || '-'}</span>
                    </div>
                    <div class="card-body bg-white">

                        <!-- メイン金額 -->
                        <div class="row text-center mb-4">
                            <div class="col">
                                <div class="text-muted small">基本給</div>
                                <div class="fs-5 fw-bold">¥${(s.baseSalary||0).toLocaleString()}</div>
                            </div>
                            <div class="col">
                                <div class="text-muted small">総支給</div>
                                <div class="fs-5 fw-bold">¥${(s.gross||0).toLocaleString()}</div>
                            </div>
                            <div class="col">
                                <div class="text-muted small">差引支給</div>
                                <div class="fs-5 fw-bold text-success">¥${(s.net||0).toLocaleString()}</div>
                            </div>
                        </div>

                        <hr>

                        <!-- 手当・控除 -->
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <h6 class="fw-bold text-muted border-bottom pb-1">手当</h6>
                                <table class="table table-sm table-borderless mb-0">
                                    <tbody>
                                        ${s.allowances.length ? s.allowances.map(a => `
                                            <tr>
                                                <td>${a.name}</td>
                                                <td class="text-end">¥${(a.amount||0).toLocaleString()}</td>
                                            </tr>
                                        `).join('') : `<tr><td colspan="2" class="text-muted">―</td></tr>`}
                                    </tbody>
                                </table>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h6 class="fw-bold text-muted border-bottom pb-1">控除</h6>
                                <table class="table table-sm table-borderless mb-0">
                                    <tbody>
                                        ${s.deductions.length ? s.deductions.map(d => `
                                            <tr>
                                                <td>${d.name}</td>
                                                <td class="text-end">¥${(d.amount||0).toLocaleString()}</td>
                                            </tr>
                                        `).join('') : `<tr><td colspan="2" class="text-muted">―</td></tr>`}
                                        ${s.incomeTax ? `
                                            <tr>
                                                <td>所得税</td>
                                                <td class="text-end">¥${s.incomeTax.toLocaleString()}</td>
                                            </tr>` : ''}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- 通勤費 -->
                        <div class="row mt-3">
                            <div class="col-md-6">
                                <div class="fw-bold text-muted small">通勤費(非課税)</div>
                                <div>¥${(s.commute?.nonTax||0).toLocaleString()}</div>
                            </div>
                            <div class="col-md-6">
                                <div class="fw-bold text-muted small">通勤費(課税)</div>
                                <div>¥${(s.commute?.tax||0).toLocaleString()}</div>
                            </div>
                        </div>
                        ${req.session.user?.isAdmin ? `
                            <div class="mt-3 text-end">
                                <a href="/hr/payroll/admin/edit/${s._id}" class="btn btn-primary btn-sm">修正</a>
                                <form action="/hr/payroll/admin/delete/${s._id}" method="POST" style="display:inline;" onsubmit="return confirm('本当に削除しますか？');">
                                    <button type="submit" class="btn btn-danger btn-sm ms-2">削除</button>
                                </form>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('') : `<div class="alert alert-info text-center">対象の給与明細はありません。</div>`}

            <a href="/hr/payroll" class="btn btn-primary mt-3">戻る</a>
        </div>
    `;
    renderPage(req, res, "給与管理", `${employee.name} の給与明細`, html);
});

router.post('/hr/payroll/admin/delete/:slipId', requireLogin, async (req, res) => {
    if (!req.session.user?.isAdmin) {
        return res.status(403).send('アクセス権限がありません');
    }

    const slipId = req.params.slipId;
    const slip = await PayrollSlip.findById(slipId);
    if (!slip) {
        return res.status(404).send('給与明細が見つかりません');
    }

    // runId を保持して削除
    const runId = slip.runId;
    await PayrollSlip.deleteOne({ _id: slipId });

    // runId にまだ他の給与明細があるかチェック
    const count = await PayrollSlip.countDocuments({ runId });
    if (count === 0) {
        await PayrollRun.deleteOne({ _id: runId });
    }

    res.redirect('/hr/payroll/' + slip.employeeId);
});

// CSVエクスポート（社員別・月別対応）
router.get('/hr/payroll/:id/export', requireLogin, async (req, res) => {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.redirect('/hr/payroll');

    // 自分か管理者しか見れない
    if (employee.userId.toString() !== req.session.user._id.toString() && !req.session.user?.isAdmin) {
        return res.status(403).send('アクセス権限がありません');
    }

    const { payMonth } = req.query;
    let filter = { employeeId: employee._id };

    if (payMonth) {
        const [year, month] = payMonth.split('-').map(Number);
        const periodFrom = new Date(year, month - 1, 1);
        const periodTo = new Date(year, month, 0);
        filter = {
            ...filter,
            runId: {
                $in: await PayrollRun.find({
                    periodFrom: { $gte: periodFrom },
                    periodTo: { $lte: periodTo }
                }).distinct('_id')
            }
        };
    }

    const slips = await PayrollSlip.find(filter).populate('runId').sort({ 'runId.periodFrom': -1 });

    // CSVヘッダ
    const csvHeader = [
        '年','月','期間','基本給','総支給','差引支給','ステータス','所得税',
        '通勤費（非課税）','通勤費（課税）','手当','控除'
    ];

    const csvRows = slips.map(s => {
        const allowancesStr = s.allowances.map(a => `${a.name}:${a.amount}`).join('; ');
        const deductionsStr = [
            ...s.deductions.map(d => `${d.name}:${d.amount}`),
            s.incomeTax ? `所得税:${s.incomeTax}` : ''
        ].filter(Boolean).join('; ');

        const runDate = s.runId?.periodFrom || new Date();
        const year = runDate.getFullYear();
        const month = runDate.getMonth() + 1;

        return [
            year,
            month,
            `${s.runId?.periodFrom?.toLocaleDateString() || '-'}〜${s.runId?.periodTo?.toLocaleDateString() || '-'}`,
            s.baseSalary || 0,
            s.gross || 0,
            s.net || 0,
            s.status || '-',
            s.incomeTax || 0,
            s.commute?.nonTax || 0,
            s.commute?.tax || 0,
            allowancesStr,
            deductionsStr
        ];
    });

    const csvContent = '\uFEFF' + [csvHeader, ...csvRows].map(r => r.join(',')).join('\n');

    // ファイル名に「年・月」を反映
    // 指定があれば payMonth、無ければ最新の runId.periodFrom から取得
    let fileYear = '';
    let fileMonth = '';
    if (payMonth) {
        [fileYear, fileMonth] = payMonth.split('-');
    } else if (slips.length) {
        const latest = slips[0].runId?.periodFrom || new Date();
        fileYear = latest.getFullYear();
        fileMonth = String(latest.getMonth() + 1).padStart(2, '0');
    }
    const filename = `${employee.name}_給与明細_${fileYear}年${fileMonth}月.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(csvContent);
});



// ログアウト

module.exports = router;