// ==============================
// routes/dashboard.js - ダッシュボード・フィードバック・リンク・テストデバッグ
// ==============================
const router = require('express').Router();
const moment = require('moment-timezone');
const { User, Employee, Attendance, Goal, LeaveRequest, PayrollSlip, PayrollRun, SemiAnnualFeedback, ApprovalRequest, BoardPost, PretestSubmission } = require('../models');
const { requireLogin, isAdmin } = require('../middleware/auth');
const { computeAIRecommendations, computeSemiAnnualGrade, escapeHtml } = require('../lib/helpers');
const { renderPage } = require('../lib/renderPage');

router.get('/dashboard', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const employee = await Employee.findOne({ userId: user._id });
        req.session.user = user;
        req.session.employee = employee;

        // DBから実際のサマリー/アクティビティを取得して表示
        const now = moment().tz('Asia/Tokyo');
        const firstDayOfMonth = now.clone().startOf('month').toDate();
        const firstDayOfNextMonth = now.clone().add(1, 'month').startOf('month').toDate();

        // 出勤サマリー（当月）
        const monthlyAttendances = await Attendance.find({ userId: user._id, date: { $gte: firstDayOfMonth, $lt: firstDayOfNextMonth } }).sort({ date: 1 });
        const workDays = monthlyAttendances.filter(a => a.status !== '欠勤').length;
        const late = monthlyAttendances.filter(a => a.status === '遅刻').length;
        const earlyLeave = monthlyAttendances.filter(a => a.status === '早退').length;
        const overtime = Math.round(monthlyAttendances.reduce((s,a)=>s + (a.overtimeHours||0),0));
        const attendanceSummary = { workDays, late, earlyLeave, overtime };

    // 欠勤数（当月）
    const absentCount = monthlyAttendances.filter(a => a.status === '欠勤').length;

    // 承認待ち申請数（全体）
    const approvalPendingCount = await ApprovalRequest.countDocuments({ status: 'pending' });

    // 過去30日間の平均承認時間（時間単位）と未処理平均経過時間
    const since30 = now.clone().subtract(30, 'days').startOf('day').toDate();
    const approvalAgg = await ApprovalRequest.aggregate([
        { $match: { requestedAt: { $exists: true, $ne: null }, processedAt: { $exists: true, $ne: null }, processedAt: { $gte: since30 } } },
        { $project: { durationHours: { $divide: [{ $subtract: ["$processedAt", "$requestedAt"] }, 1000 * 60 * 60] } } },
        { $group: { _id: null, avgHours: { $avg: "$durationHours" }, count: { $sum: 1 } } }
    ]);
    const avgApprovalHours = (approvalAgg && approvalAgg[0] && approvalAgg[0].avgHours != null) ? Math.round(approvalAgg[0].avgHours * 10) / 10 : null;
    const approvalProcessedCount = (approvalAgg && approvalAgg[0]) ? approvalAgg[0].count : 0;
    const pendingReqs = await ApprovalRequest.find({ status: 'pending' }).lean();
    const pendingAvgHours = pendingReqs.length ? Math.round(pendingReqs.reduce((s, r) => s + ((Date.now() - new Date(r.requestedAt)) / (1000 * 60 * 60)), 0) / pendingReqs.length * 10) / 10 : null;

        // 目標サマリー
    const goals = await Goal.find({ ownerId: employee._id }).lean();
    const goalPersonal = goals && goals.length ? Math.round(goals.reduce((s,g)=>s + (g.progress||0),0) / goals.length) : null;
    const goalSummary = { personal: goalPersonal, team: 65 };
    // 目標 KPI
    const goalsTotal = goals ? goals.length : 0;
    const goalsCompleted = goals ? goals.filter(g => (g.status === 'completed' || (g.progress || 0) >= 100)).length : 0;
    const goalsOverdue = goals ? goals.filter(g => g.deadline && new Date(g.deadline) < now.toDate() && g.status !== 'completed').length : 0;
    const goalsInProgress = Math.max(0, goalsTotal - goalsCompleted);

        // 休暇サマリー
        const leavePendingCount = await LeaveRequest.countDocuments({ userId: user._id, status: 'pending' });
        const leaveUpcomingCount = await LeaveRequest.countDocuments({ userId: user._id, startDate: { $gte: now.toDate() } });
        const leaveSummary = { pending: leavePendingCount, upcoming: leaveUpcomingCount };
    const leaveApprovedCount = await LeaveRequest.countDocuments({ userId: user._id, status: 'approved' });
    const leaveRejectedCount = await LeaveRequest.countDocuments({ userId: user._id, status: 'rejected' });

        // 給与サマリー（簡易）
        const payrollPending = await PayrollSlip.countDocuments({ employeeId: employee._id, status: { $ne: 'paid' } });
        const payrollUpcoming = await PayrollRun.countDocuments({ locked: false });
        const payrollSummary = { pending: payrollPending, upcoming: payrollUpcoming };
    // 給与 KPI: 未払合計（簡易）
    const unpaidSlips = await PayrollSlip.find({ status: { $ne: 'paid' } }).lean();
    const unpaidTotalNet = unpaidSlips.reduce((s,p) => s + (p.net || 0), 0) || 0;
    const unpaidCount = unpaidSlips.length;
    const paidCount = await PayrollSlip.countDocuments({ employeeId: employee._id, status: 'paid' });

    // 勤怠の内訳（当月）
    const attendanceNormal = Math.max(0, attendanceSummary.workDays - attendanceSummary.late - attendanceSummary.earlyLeave - absentCount);

        // 通知: 掲示板・休暇・勤怠・目標の最新イベントをまとめる
        const recentPosts = await BoardPost.find().sort({ createdAt: -1 }).limit(5).lean();
        const recentLeaves = await LeaveRequest.find({}).sort({ createdAt: -1 }).limit(5).lean();
        const recentGoals = await Goal.find({ ownerId: employee._id }).sort({ createdAt: -1 }).limit(5).lean();
        const recentAttendances = await Attendance.find({ userId: user._id }).sort({ date: -1 }).limit(7).lean();

        let notifications = [];
        notifications.push(...recentPosts.map(p => ({ message: `掲示板: ${p.title}`, date: p.createdAt || p.updatedAt || new Date() })));
        notifications.push(...recentLeaves.map(l => ({ message: `休暇申請: ${l.name} (${l.leaveType}) - ${l.status}`, date: l.createdAt })));
        notifications.push(...recentGoals.map(g => ({ message: `目標: ${g.title} の更新`, date: g.createdAt })));
        notifications.push(...recentAttendances.map(a => ({ message: `勤怠: ${moment(a.date).format('YYYY-MM-DD')} - ${a.status || '出勤'}`, date: a.date })));

    // 日付でソート
    notifications = notifications.sort((a,b)=> new Date(b.date) - new Date(a.date)).map(n=>({ message: n.message, date: moment(n.date).format('YYYY-MM-DD') }));
    // ページング（表示はサーバーサイドで4件/ページ）
    const activityPage = Math.max(1, parseInt(req.query.activityPage || '1'));
    const activityPageSize = 4;
    const activityTotal = notifications.length;
    const activityPages = Math.max(1, Math.ceil(activityTotal / activityPageSize));
    const pagedNotifications = notifications.slice((activityPage - 1) * activityPageSize, activityPage * activityPageSize);

        // 今日のアクション（動的）
        const todayActions = [];
        if (leaveSummary.pending > 0) todayActions.push({ title: '休暇承認', module: '休暇管理' });
        if (payrollSummary.pending > 0) todayActions.push({ title: '給与処理確認', module: '給与管理' });
        todayActions.push({ title: '目標確認', module: '目標設定' });

        // 月間カレンダー配列（勤務状況）
        const year = now.year();
        const month = now.month();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthCalendar = [];
        const attendanceByDate = {};
        monthlyAttendances.forEach(a => attendanceByDate[moment(a.date).format('YYYY-MM-DD')] = a);
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            monthCalendar.push({ date: dateStr, ...(attendanceByDate[dateStr] ? { type: attendanceByDate[dateStr].status || 'work', overtime: attendanceByDate[dateStr].overtimeHours || 0 } : {}) });
        }

        // AIレコメンデーション
        const aiRecommendations = computeAIRecommendations({ attendanceSummary, goalSummary, leaveSummary, payrollSummary, monthlyAttendance: monthCalendar });

        // 半期評価（予測）を計算
        const semi = await computeSemiAnnualGrade(user._id, employee);

        // 過去6か月の出勤推移（各月の出勤日数）
        const attendanceTrend = [];
        for (let i = 5; i >= 0; i--) {
            const mStart = now.clone().subtract(i, 'months').startOf('month').toDate();
            const mEnd = now.clone().subtract(i, 'months').endOf('month').toDate();
            const label = now.clone().subtract(i, 'months').format('YYYY-MM');
            const count = await Attendance.countDocuments({ userId: user._id, date: { $gte: mStart, $lte: mEnd }, status: { $ne: '欠勤' } });
            attendanceTrend.push({ label, count });
        }

        // ユーザーの過去フィードバック履歴（表示用）
        const feedbackHistory = await SemiAnnualFeedback.find({ userId: user._id }).sort({ createdAt: -1 }).limit(6).lean();

    renderPage(req, res, '総合ダッシュボード', `${employee.name} さん、こんにちは`, `
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
            <script src="https://cdn.jsdelivr.net/npm/chart.js@4.3.0/dist/chart.umd.min.js"></script>
            <style>
                :root{--primary:#0b5fff;--muted:#6b7280;--card:#ffffff}
                body{font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,'Noto Sans JP',sans-serif;background:linear-gradient(180deg,#f4f7fb,#ffffff)}
                .hero{display:flex;justify-content:space-between;align-items:center;padding:20px;border-radius:12px;background:linear-gradient(90deg,#eef4ff,#ffffff);box-shadow:0 10px 30px rgba(11,95,255,0.06);margin-bottom:18px}
                .hero .title{font-weight:800;font-size:20px;color:#072144}
                .hero .meta{color:var(--muted);font-size:13px}
                .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}
                @media(max-width:1100px){.cards{grid-template-columns:repeat(2,1fr)}}
                .card-enterprise{background:var(--card);border-radius:12px;padding:16px;box-shadow:0 8px 30px rgba(12,20,40,0.04)}
                .kpi-value{font-size:20px;font-weight:800;color:#072144}
                .kpi-label{color:var(--muted);font-size:13px}
                .grid{display:grid;grid-template-columns:2fr 1fr;gap:18px}
                @media(max-width:980px){.grid{grid-template-columns:1fr}}
                .ai-panel .ai-item{display:flex;justify-content:space-between;align-items:center;padding:10px;border-radius:8px;background:#fbfdff;margin-bottom:8px}
                .ai-badge{background:linear-gradient(90deg,#f9fafb,#eef8ff);padding:6px 8px;border-radius:999px;font-weight:700;color:var(--primary);font-size:12px}
                .activity-list{display:flex;flex-direction:column;gap:8px}
                .activity{padding:10px;border-radius:8px;background:#fff}
                .shortcut-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}
                .shortcut-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:10px;border:1px solid #eef2ff;background:#fff;color:#0b2540;text-decoration:none;font-weight:700;font-size:13px;height:72px}
                .shortcut-btn .shortcut-icon{font-size:18px;color:#0b5fff}
                .shortcut-btn:hover{transform:translateY(-4px);box-shadow:0 8px 20px rgba(11,95,255,0.06)}
                @media(max-width:480px){.shortcut-grid{grid-template-columns:repeat(2,1fr)}}

                /* Sidebar summary single-line and mini-chart sizing */
                .summary-line{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px;color:var(--muted)}
                .mini-chart{width:120px !important;height:120px !important;max-width:120px;max-height:120px}
            </style>

            <div class="container-fluid mt-3">
                <div class="container">
                    <div class="hero">
                        <div>
                            <div class="title">DXPRO SOLUTIONS 様</div>
                            <div class="meta">${escapeHtml(employee.name)} • ${escapeHtml(employee.position || '')} | ${escapeHtml(employee.department || '')}</div>
                        </div>
                        <div style="text-align:right">
                            <div class="meta">従業員ID: <strong>${escapeHtml(employee.employeeId)}</strong></div>
                            <div id="current-time-inline" style="margin-top:6px;color:var(--muted)"></div>
                        </div>
                    </div>

                    <div class="cards">
                        <div class="card-enterprise">
                            <div class="kpi-label">出勤日数（今月）</div>
                            <div class="kpi-value">${attendanceSummary.workDays} 日</div>
                            <div style="color:var(--muted);font-size:13px">遅刻: ${attendanceSummary.late} / 早退: ${attendanceSummary.earlyLeave}</div>
                        </div>
                        <div class="card-enterprise">
                            <div class="kpi-label">残業時間（今月）</div>
                            <div class="kpi-value">${attendanceSummary.overtime} h</div>
                            <canvas id="overtimeSpark" height="60"></canvas>
                        </div>
                        <div class="card-enterprise">
                            <div class="kpi-label">半期評価予測</div>
                            <div class="kpi-value">GRADE ${semi.grade} ・ ${semi.score} 点</div>
                            <div style="color:var(--muted);font-size:13px">${escapeHtml(semi.explanation)}</div>
                        </div>
                        <div class="card-enterprise">
                            <div class="kpi-label">未承認休暇</div>
                            <div class="kpi-value">${leaveSummary.pending} 件</div>
                            <div style="color:var(--muted);font-size:13px">今後の休暇: ${leaveSummary.upcoming} 件</div>
                        </div>
                        <div class="card-enterprise">
                            <div class="kpi-label">個人目標達成率</div>
                            <div class="kpi-value">${goalSummary.personal != null ? goalSummary.personal + '%' : '未設定'}</div>
                            <div style="margin-top:8px">
                                ${goalSummary.personal != null ? `
                                <div class=\"progress\" style=\"height:8px;background:#eef2ff;border-radius:8px\"><div class=\"progress-bar bg-primary\" role=\"progressbar\" style=\"width:${goalSummary.personal}%\"></div></div>
                                ` : `
                                <div style=\"font-size:12px;color:var(--muted)\">目標を作成して進捗を可視化しましょう</div>
                                `}
                            </div>
                        </div>
                        <div class="card-enterprise">
                            <div class="kpi-label">欠勤数（今月）</div>
                            <div class="kpi-value">${absentCount} 日</div>
                            <div style="color:var(--muted);font-size:13px">遅刻/早退:${attendanceSummary.late}/${attendanceSummary.earlyLeave}</div>
                        </div>
                        <div class="card-enterprise">
                            <div class="kpi-label">平均承認時間（30日）</div>
                            <div class="kpi-value">${avgApprovalHours != null ? avgApprovalHours + ' h' : 'データ不足'}</div>
                            <div style="color:var(--muted);font-size:13px">処理済: ${approvalProcessedCount} 件 / 未処理平均: ${pendingAvgHours != null ? pendingAvgHours + ' h' : '0 h'}</div>
                        </div>
                        <div class="card-enterprise">
                            <div class="kpi-label">承認待ち申請</div>
                            <div class="kpi-value">${approvalPendingCount} 件</div>
                            <div style="color:var(--muted);font-size:13px">承認が必要な申請を確認してください</div>
                        </div>
                    </div>

                    <div class="grid">
                        <main>
                            <div class="card-enterprise">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                                    <h4 style="margin:0">今日のアクション</h4>
                                    <div style="color:var(--muted);font-size:13px">${todayActions.length} 件</div>
                                </div>
                                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
                                    ${todayActions.map(a => `<div style="min-width:220px;flex:1" class="p-2 rounded" title="${escapeHtml(a.title)}"><div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${escapeHtml(a.title)}</strong><div style="color:var(--muted);font-size:13px">${escapeHtml(a.module || '')}</div></div><div><a href="#" class="btn btn-sm btn-outline-primary">移動</a></div></div></div>`).join('')}
                                </div>

                                <div style="display:flex;gap:12px;align-items:flex-start">
                                    <div style="flex:1">
                                        <h5 style="margin:0 0 8px 0">進行中タスク</h5>
                                        ${aiRecommendations.slice(0,3).map((r,i) => `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between"><div><strong>${escapeHtml(r.title)}</strong><div style="color:var(--muted);font-size:12px">${escapeHtml(r.description)}</div></div><div class="ai-badge">優先度 ${Math.max(60,85 - i*10)}%</div></div><div class="progress" style="height:8px;margin-top:8px"><div class="progress-bar bg-success" role="progressbar" style="width:${(i+1)*30}%"></div></div></div>`).join('')}
                                    </div>

                                    <div style="width:260px">
                                        <h5 style="margin:0 0 8px 0">アクティビティ</h5>
                                        <div class="activity-list">
                                            ${pagedNotifications.map(n => `<div class="activity"><div style="font-weight:700">${escapeHtml(n.message)}</div><div style="color:var(--muted);font-size:12px">${escapeHtml(n.date)}</div></div>`).join('')}
                                        </div>
                                        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
                                            <div style="font-size:13px;color:var(--muted)">合計 ${activityTotal} 件</div>
                                            <div style="display:flex;gap:6px;align-items:center">
                                                ${activityPage > 1 ? `<a href="/dashboard?activityPage=${activityPage-1}" class="btn btn-outline-secondary">前へ</a>` : ''}
                                                ${activityPage < activityPages ? `<a href="/dashboard?activityPage=${activityPage+1}" class="btn btn-outline-secondary">次へ</a>` : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="card-enterprise mt-3">
                                <h5 style="margin-bottom:12px">AIレコメンデーション</h5>
                                <div class="ai-panel">
                                    ${aiRecommendations.map(r => `
                                        <div class="ai-item">
                                            <div>
                                                <div style="font-weight:700">${escapeHtml(r.title)}</div>
                                                <div style="color:var(--muted);font-size:12px">${escapeHtml(r.description)}</div>
                                                <div style="color:#9ca3af;font-size:11px">理由: ${escapeHtml(r.reason || 'データ分析')}</div>
                                            </div>
                                            <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
                                                <div class="ai-badge">信頼度 ${r.confidence}%</div>
                                                <div><a href="${r.link}" class="btn btn-sm btn-primary">実行</a></div>
                                            </div>
                                        </div>
                                    `).join('')}
                                        <div style="margin-top:12px;padding:10px;border-radius:8px;background:#fbfbff">
                                            <div style="font-weight:700;margin-bottom:6px">半期評価の内訳</div>
                                            <div style="font-size:13px;color:var(--muted)">出勤: ${semi.breakdown.attendanceScore || 0}点 / 目標: ${semi.breakdown.goalScore || 0}点 / 休暇: ${semi.breakdown.leaveScore || 0}点 / 残業: ${semi.breakdown.overtimeScore || 0}点 / 給与: ${semi.breakdown.payrollScore || 0}点</div>
                                            <div style="margin-top:8px;font-size:13px;color:var(--muted)">${escapeHtml(semi.explanation)}</div>
                                            <form id="semi-feedback" style="margin-top:10px;display:flex;flex-direction:column;gap:8px">
                                                <div style="display:flex;gap:8px;align-items:center">
                                                    <label style="font-weight:600">この評価は妥当ですか？</label>
                                                    <label><input type="radio" name="agree" value="true"> 妥当</label>
                                                    <label><input type="radio" name="agree" value="false"> 違う</label>
                                                </div>
                                                <textarea name="comment" placeholder="コメント（任意）" style="min-height:60px;padding:8px;border-radius:6px;border:1px solid #ddd"></textarea>
                                                <div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" id="semi-submit" class="btn btn-primary">送信</button></div>
                                            </form>
                                            <script>
                                                (function(){
                                                    const btn = document.getElementById('semi-submit');
                                                    btn.addEventListener('click', async ()=>{
                                                        const form = document.getElementById('semi-feedback');
                                                        const formData = new FormData(form);
                                                        const agree = formData.get('agree');
                                                        const comment = formData.get('comment');
                                                        try {
                                                            const resp = await fetch('/feedback/semi', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ predictedGrade: '${semi.grade}', predictedScore: ${semi.score}, agree: agree === 'true', comment }) });
                                                            const j = await resp.json();
                                                            if (j.ok) { btn.textContent='送信済み'; btn.disabled=true; }
                                                            else alert('送信に失敗しました');
                                                        } catch(e){ console.error(e); alert('送信エラー'); }
                                                    });
                                                })();
                                            </script>
                                        </div>
                                </div>
                            </div>
                            <div class="card-enterprise mt-3">
                                <h5 style="margin-bottom:12px">過去6か月の出勤推移</h5>
                                <canvas id="attendanceTrend" height="80"></canvas>
                                <div style="margin-top:8px;color:var(--muted);font-size:13px">各月の出勤日数 (欠勤を除く)</div>
                            </div>

                            <div class="card-enterprise mt-3">
                                <h5 style="margin-bottom:12px">あなたの評価フィードバック履歴</h5>
                                <div style="display:flex;flex-direction:column;gap:8px">
                                    ${feedbackHistory.length ? feedbackHistory.map(f=>`<div style="padding:8px;border-radius:6px;background:#fff"><div style="font-weight:700">予測: ${escapeHtml(f.predictedGrade||'') } ・ ${f.predictedScore||''} 点</div><div style="color:var(--muted);font-size:13px">${escapeHtml(f.agree ? '妥当' : '違う')} ・ ${moment(f.createdAt).format('YYYY-MM-DD')}</div><div style="margin-top:6px;color:#333">${escapeHtml(f.comment||'')}</div></div>`).join('') : '<div style="color:var(--muted)">フィードバックはまだありません</div>'}
                                </div>
                            </div>
                        </main>

                        <aside>
                            <div class="card-enterprise">
                                <h5 style="margin:0 0 12px 0">ショートカット</h5>
                                <div class="shortcut-grid">
                                    ${[
                                        { title: '勤怠管理', link: '/attendance-main', icon: 'fa-business-time' },
                                        { title: '目標管理', link: '/goals', icon: 'fa-bullseye' },
                                        { title: '掲示板', link: '/board', icon: 'fa-comments' },
                                    ].map(s => `<a href="${s.link}" class="shortcut-btn" aria-label="${s.title}"><div class="shortcut-icon"><i class="fa-solid ${s.icon}"></i></div><div class="shortcut-label">${s.title}</div></a>`).join('')}
                                </div>
                                <div style="margin-top:12px">
                                    <h6 style="margin:0 0 8px 0">稼働サマリー</h6>
                                    <div style="display:flex;flex-direction:column;gap:8px">
                                        <div style="background:#fff;padding:10px;border-radius:8px">
                                            <div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:700">目標サマリー</div><canvas id="goalsChart" class="mini-chart" width="120" height="60"></canvas></div>
                                                <div class="summary-line">${goalsTotal > 0 ? `個人目標達成率: ${goalSummary.personal}% ・ 目標数: ${goalsTotal}` : '目標なし'}</div>
                                            <div style="display:flex;gap:8px;margin-top:6px;font-size:13px">
                                                <div style="color:#072144;font-weight:700">完了: ${goalsCompleted} 件</div>
                                                <div style="color:var(--muted)">進行中: ${goalsInProgress} 件</div>
                                                <div style="color:var(--muted)">期限切れ: ${goalsOverdue} 件</div>
                                            </div>
                                        </div>
                                        <div style="background:#fff;padding:10px;border-radius:8px">
                                            <div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:700">休暇サマリー</div><canvas id="leaveChart" class="mini-chart" width="120" height="60"></canvas></div>
                                            <div class="summary-line">未承認: ${leaveSummary.pending} 件 ・ 予定: ${leaveSummary.upcoming} 件</div>
                                            <div style="display:flex;gap:8px;margin-top:6px;font-size:13px">
                                                <div style="color:#072144;font-weight:700">承認済: ${leaveApprovedCount} 件</div>
                                                <div style="color:var(--muted)">却下: ${leaveRejectedCount} 件</div>
                                            </div>
                                        </div>
                                        <div style="background:#fff;padding:10px;border-radius:8px">
                                            <div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:700">勤怠サマリー</div><canvas id="attendanceChart" class="mini-chart" width="120" height="60"></canvas></div>
                                                <div class="summary-line">出勤: ${attendanceSummary.workDays} 日 ・ 欠勤: ${absentCount} 日 ・ 残業: ${attendanceSummary.overtime} h</div>
                                            <div style="display:flex;gap:8px;margin-top:6px;font-size:13px">
                                                <div style="color:#072144;font-weight:700">遅刻: ${attendanceSummary.late} 件</div>
                                                <div style="color:var(--muted)">早退: ${attendanceSummary.earlyLeave} 件</div>
                                            </div>
                                        </div>
                                        <div style="background:#fff;padding:10px;border-radius:8px">
                                            <div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:700">給与サマリー</div><canvas id="payrollMiniChart" class="mini-chart" width="120" height="60"></canvas></div>
                                                <div class="summary-line">未処理給与: ${payrollSummary.pending} 件 ・ 次回実行予定: ${payrollSummary.upcoming} 件</div>
                                            <div style="display:flex;gap:8px;margin-top:6px;font-size:13px">
                                                <div style="color:#072144;font-weight:700">未払合計: ¥${Math.round(unpaidTotalNet).toLocaleString()}</div>
                                                <div style="color:var(--muted)">未処理件数: ${payrollSummary.pending} 件</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>

            <script>
                // Sample sparkline data (replace with real series if available)
                const overtimeData = Array.from({length:12}, (_,i) => Math.round(Math.random()*3 + ${attendanceSummary.overtime}/12));
                const ctx = document.getElementById('overtimeSpark');
                if(ctx){ new Chart(ctx, { type: 'line', data: { labels: overtimeData.map((_,i)=>i+1), datasets:[{data:overtimeData,borderColor:'#0b5fff',backgroundColor:'rgba(11,95,255,0.08)',fill:true,tension:0.4,pointRadius:0}] }, options:{responsive:true,plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{display:false},y:{display:false}} } }); }

                const pctx = document.getElementById('payrollChart');
                if(pctx){ new Chart(pctx, { type:'doughnut', data:{ labels:['処理済','未処理'], datasets:[{data:[${Math.max(0,payrollSummary.upcoming- payrollSummary.pending)}, ${payrollSummary.pending}], backgroundColor:['#16a34a','#f59e0b'] }] }, options:{responsive:true,plugins:{legend:{position:'bottom'}} } }); }

                // Attendance trend
                const trendCtx = document.getElementById('attendanceTrend');
                if(trendCtx){
                    const labels = ${JSON.stringify(attendanceTrend.map(t=>t.label))};
                    const data = ${JSON.stringify(attendanceTrend.map(t=>t.count))};
                    new Chart(trendCtx, { type:'line', data:{ labels, datasets:[{ label:'出勤日数', data, borderColor:'#0b5fff', backgroundColor:'rgba(11,95,255,0.08)', fill:true, tension:0.3 }] }, options:{responsive:true, plugins:{legend:{display:false}} , scales:{y:{beginAtZero:true}} } });
                }

                // Sidebar mini charts: goals, leave, attendance, payrollMini
                const goalsCtx = document.getElementById('goalsChart');
                if (goalsCtx) {
                    new Chart(goalsCtx, {
                        type: 'doughnut',
                        data: {
                            labels: ['完了','進行中','期限切れ'],
                            datasets: [{
                                data: [${goalsCompleted}, ${goalsInProgress}, ${goalsOverdue}],
                                backgroundColor: ['#16a34a','#0ea5e9','#f59e0b']
                            }]
                        },
                        options: { responsive: true, plugins: { legend: { display: false } } }
                    });
                }

                const leaveCtx = document.getElementById('leaveChart');
                if (leaveCtx) {
                    new Chart(leaveCtx, {
                        type: 'doughnut',
                        data: {
                            labels: ['承認済','未承認','却下'],
                            datasets: [{
                                data: [${leaveApprovedCount}, ${leaveSummary.pending}, ${leaveRejectedCount}],
                                backgroundColor: ['#10b981','#f59e0b','#ef4444']
                            }]
                        },
                        options: { responsive: true, plugins: { legend: { display: false } } }
                    });
                }

                const attCtx = document.getElementById('attendanceChart');
                if (attCtx) {
                    new Chart(attCtx, {
                        type: 'doughnut',
                        data: {
                            labels: ['出勤','欠勤','遅刻'],
                            datasets: [{
                                data: [${attendanceSummary.workDays}, ${absentCount}, ${attendanceSummary.late}],
                                backgroundColor: ['#0b5fff','#ef4444','#f59e0b']
                            }]
                        },
                        options: { responsive: true, plugins: { legend: { display: false } } }
                    });
                }

                // Inline live clock (Asia/Tokyo)
                const timeEl = document.getElementById('current-time-inline');
                if (timeEl) {
                    const fmt = new Intl.DateTimeFormat('ja-JP', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
                    const updateTime = () => { timeEl.textContent = fmt.format(new Date()); };
                    updateTime();
                    setInterval(updateTime, 1000);
                }

                const payrollMiniCtx = document.getElementById('payrollMiniChart');
                if (payrollMiniCtx) {
                    new Chart(payrollMiniCtx, {
                        type: 'doughnut',
                        data: {
                            labels: ['支給済','未払','未処理'],
                            datasets: [{
                                data: [${paidCount}, ${unpaidCount}, ${payrollSummary.pending}],
                                backgroundColor: ['#16a34a','#ef4444','#f59e0b']
                            }]
                        },
                        options: { responsive: true, plugins: { legend: { display: false } } }
                    });
                }
            </script>
        `);

    } catch (error) {
        console.error(error);
        res.status(500).send('サーバーエラー');
    }
});

// フィードバックを保存する API
router.post('/feedback/semi', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const employee = await Employee.findOne({ userId: user._id });
        const { predictedGrade, predictedScore, agree, comment } = req.body;
        const fb = new SemiAnnualFeedback({ userId: user._id, employeeId: employee ? employee._id : null, predictedGrade, predictedScore, agree: !!agree, comment });
        await fb.save();
        return res.json({ ok: true });
    } catch (err) {
        console.error('feedback save error', err);
        return res.status(500).json({ ok: false, error: 'save_failed' });
    }
});

// リンク集（入社前テストページへのボタンを追加）
router.get('/links', requireLogin, (req, res) => {
    renderPage(req, res, 'リンク集', '社内リンク集', `
        <div class="card-enterprise">
            <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start">
                <div style="flex:1;min-width:260px">
                    <h5 style="margin:0 0 8px 0">社内・関連リンク</h5>
                    <p style="color:var(--muted);margin:0 0 12px 0">よく使うポータル、教育コンテンツ、面談用の入社前テストへアクセスできます。</p>

                    <style>
                        /* links grid: two columns by default, 1 column on narrow screens */
                        @media (max-width:560px){ .links-grid{ grid-template-columns: 1fr !important; } }
                    </style>
                    <div class="links-grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px">
                        <a class="btn" href="https://dxpro-sol.com" target="_blank" rel="noopener" style="display:flex;gap:14px;align-items:center;justify-content:flex-start;border:1px solid #e6eefc;background:#fff;color:#0b2540;padding:18px;border-radius:12px">
                            <i class="fa-solid fa-building" style="color:#0b5fff;width:36px;font-size:26px;text-align:center"></i>
                            <div style="text-align:left"><div style="font-weight:800;font-size:18px">DXPRO SOLUTIONS ポータル</div><div style="color:var(--muted);font-size:14px;margin-top:4px">社内ポータル・通知</div></div>
                        </a>

                        <a class="btn" href="https://2024073118010411766192.onamaeweb.jp/" target="_blank" rel="noopener" style="display:flex;gap:14px;align-items:center;justify-content:flex-start;border:1px solid #fde68a;background:#fff;color:#92400e;padding:18px;border-radius:12px">
                            <i class="fa-solid fa-link" style="color:#f59e0b;width:36px;font-size:26px;text-align:center"></i>
                            <div style="text-align:left"><div style="font-weight:800;font-size:18px">業務サポートAI（IT-IS）</div><div style="color:var(--muted);font-size:14px;margin-top:4px">自社AI検索パッケージ</div></div>
                        </a>

                        <a class="btn" href="https://webmail1022.onamae.ne.jp/" target="_blank" rel="noopener" style="display:flex;gap:14px;align-items:center;justify-content:flex-start;border:1px solid #e6eefc;background:#fff;color:#0b2540;padding:18px;border-radius:12px">
                            <i class="fa-solid fa-envelope" style="color:#0b5fff;width:36px;font-size:26px;text-align:center"></i>
                            <div style="text-align:left"><div style="font-weight:800;font-size:18px">Webメール（ONAMAE）</div><div style="color:var(--muted);font-size:14px;margin-top:4px">社内メールのログイン</div></div>
                        </a>

                        <a class="btn" href="https://dxpro-recruit-c76b3f4df6d9.herokuapp.com/login.html" target="_blank" rel="noopener" style="display:flex;gap:14px;align-items:center;justify-content:flex-start;border:1px solid #e6eefc;background:#fff;color:#0b2540;padding:18px;border-radius:12px">
                            <i class="fa-solid fa-user-tie" style="color:#16a34a;width:36px;font-size:26px;text-align:center"></i>
                            <div style="text-align:left"><div style="font-weight:800;font-size:18px">採用ポータル (Heroku)</div><div style="color:var(--muted);font-size:14px;margin-top:4px">候補者管理ログイン</div></div>
                        </a>

                        <a class="btn" href="https://dxpro-edu.web.app/" target="_blank" rel="noopener" style="display:flex;gap:14px;align-items:center;justify-content:flex-start;border:1px solid #e6eefc;background:#fff;color:#0b2540;padding:18px;border-radius:12px">
                            <i class="fa-solid fa-graduation-cap" style="color:#16a34a;width:36px;font-size:26px;text-align:center"></i>
                            <div style="text-align:left"><div style="font-weight:800;font-size:18px">教育コンテンツ</div><div style="color:var(--muted);font-size:14px;margin-top:4px">技術学習・コース</div></div>
                        </a>

                        <a class="btn" href="/board" style="display:flex;gap:14px;align-items:center;justify-content:flex-start;border:1px solid #e6eefc;background:#fff;color:#0b2540;padding:18px;border-radius:12px">
                            <i class="fa-solid fa-comments" style="color:#f59e0b;width:36px;font-size:26px;text-align:center"></i>
                            <div style="text-align:left"><div style="font-weight:800;font-size:18px">社内掲示板</div><div style="color:var(--muted);font-size:14px;margin-top:4px">お知らせ・コミュニケーション</div></div>
                        </a>

                        <a class="btn" href="/hr" style="display:flex;gap:14px;align-items:center;justify-content:flex-start;border:1px solid #e6eefc;background:#fff;color:#0b2540;padding:18px;border-radius:12px">
                            <i class="fa-solid fa-users" style="color:#0b5fff;width:36px;font-size:26px;text-align:center"></i>
                            <div style="text-align:left"><div style="font-weight:800;font-size:18px">人事管理</div><div style="color:var(--muted);font-size:14px;margin-top:4px">人事データと手続き</div></div>
                        </a>
                    </div>
                </div>

                <div style="width:420px;min-width:260px">
                    <h5 style="margin:0 0 8px 0">入社前テスト（面談向け）</h5>
                    <p style="color:var(--muted);margin:0 0 12px 0">各言語ごとに面談想定の質問＋長めのスクリプト問題を用意しています。選択して詳細へ移動してください。</p>

                    <div style="display:flex;flex-wrap:wrap;gap:8px">
                        <a class="btn" href="/pretest/java" style="background:#0b5fff;color:#fff;border-radius:999px;padding:8px 12px;font-weight:700">Java</a>
                        <a class="btn" href="/pretest/javascript" style="background:#1a73e8;color:#fff;border-radius:999px;padding:8px 12px;font-weight:700">JavaScript</a>
                        <a class="btn" href="/pretest/python" style="background:#16a34a;color:#fff;border-radius:999px;padding:8px 12px;font-weight:700">Python</a>
                        <a class="btn" href="/pretest/php" style="background:#6b7280;color:#fff;border-radius:999px;padding:8px 12px;font-weight:700">PHP</a>
                        <a class="btn" href="/pretest/csharp" style="background:#0ea5e9;color:#fff;border-radius:999px;padding:8px 12px;font-weight:700">C#</a>
                        <a class="btn" href="/pretest/android" style="background:#7c3aed;color:#fff;border-radius:999px;padding:8px 12px;font-weight:700">Android</a>
                        <a class="btn" href="/pretest/swift" style="background:#ef4444;color:#fff;border-radius:999px;padding:8px 12px;font-weight:700">Swift</a>
                    </div>

                    <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
                        <a class="btn btn-primary" href="/pretest">共通テストを実施</a>
                        <a class="btn" href="/pretest/answers" style="background:#f3f4f6;color:#0b2540;border-radius:999px;padding:8px 12px;font-weight:700">模範解答（共通）</a>
                    </div>
                </div>
            </div>
        </div>
    `);
});

// 共通テスト（Q1-Q40） 模範解答ページ
router.get('/debug/pretests', requireLogin, isAdmin, async (req, res) => {
    try {
        const items = await PretestSubmission.find().sort({ createdAt: -1 }).limit(200).lean();
        return res.json({ ok: true, count: items.length, items });
    } catch (err) {
        console.error('debug pretests error', err);
        return res.status(500).json({ ok: false, error: 'debug_failed' });
    }
});
// デバッグ: 自分が送信した（または任意のメールで絞った）入社前テストをJSONで返す（ログインユーザー用）
router.get('/debug/my-pretests', requireLogin, async (req, res) => {
    try {
        const email = req.query.email || null;
        const q = {};
        if (email) q.email = email;
        const items = await PretestSubmission.find(q).sort({ createdAt: -1 }).limit(200).lean();
        return res.json({ ok: true, count: items.length, items });
    } catch (err) {
        console.error('debug my-pretests error', err);
        return res.status(500).json({ ok: false, error: 'debug_failed' });
    }
});

module.exports = router;
