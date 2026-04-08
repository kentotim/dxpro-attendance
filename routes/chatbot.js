// ==============================
// routes/chatbot.js — 社内AIチャットボット（拡張版 v2）
// ==============================
const router = require('express').Router();
const moment = require('moment-timezone');
const { requireLogin } = require('../middleware/auth');
const {
    User, Employee, Attendance, Goal, LeaveRequest,
    PayrollSlip, ApprovalRequest, CompanyRule, DailyReport
} = require('../models');
const { computeSemiAnnualGrade } = require('../lib/helpers');

function jst() { return moment().tz('Asia/Tokyo'); }

function classifyIntent(text) {
    const t = text.toLowerCase()
        .replace(/[！!？?。、.,　 ]/g, ' ')
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    const patterns = [
        { intent: 'greeting',            re: /こんにち|おはよ|こんばん|はじめ|ヘルプ|help|何ができ|使い方|機能|できること/ },
        { intent: 'thanks',              re: /ありがとう|thank|助かり|了解|わかった|ok|オーケー/ },
        { intent: 'time',                re: /今.*時間|何時|時刻|現在.*時/ },
        { intent: 'date',                re: /今日.*日付|今日.*何日|今日.*曜|何月何日|日付/ },
        { intent: 'summary',             re: /サマリー|まとめ|全体.*状況|状況.*まとめ|概要|全部|今日.*状況/ },
        { intent: 'attendance_today',    re: /今日.*(勤怠|出勤|打刻|状況)|出勤.*今日|打刻.*(状況|確認)|今日.*出勤/ },
        { intent: 'attendance_month',    re: /今月.*(勤怠|出勤|遅刻|残業|早退|欠勤)|勤怠.*今月|今月.*状況/ },
        { intent: 'attendance_late',     re: /遅刻|遅れ|ちこく/ },
        { intent: 'attendance_absent',   re: /欠勤|休ん|休んだ/ },
        { intent: 'overtime',            re: /残業|時間外/ },
        { intent: 'attendance_calendar', re: /カレンダー|スケジュール|予定|出勤.*予定/ },
        { intent: 'stamp_missing',       re: /打刻.*(漏れ|忘れ|できてない|し忘れ)|漏れ.*打刻/ },
        { intent: 'stamp_checkin',       re: /出勤.*打刻|打刻.*出勤|今.*出勤|チェック.*イン/ },
        { intent: 'stamp_checkout',      re: /退勤.*打刻|打刻.*退勤|今.*退勤|チェック.*アウト|お疲れ/ },
        { intent: 'goals_status',        re: /目標.*(状況|進捗|どう|何|確認)|進捗.*(目標|状況)/ },
        { intent: 'goals_overdue',       re: /目標.*(期限|遅れ|超過|期切)|期限.*切/ },
        { intent: 'goals_create',        re: /目標.*(作成|追加|新規|登録|立て|設定)|新し.*目標/ },
        { intent: 'goals_approval',      re: /目標.*(承認|申請|審査)/ },
        { intent: 'leave_status',        re: /休暇.*(状況|申請|どう|何件|確認)|有給.*(残|何日|残日)|残.*有給/ },
        { intent: 'leave_apply',         re: /休暇.*(申請|取得|取りたい|取れ)|申請.*休暇|有給.*取|休み.*取|休みたい/ },
        { intent: 'payroll_breakdown',   re: /給与.*(内訳|控除|税|保険)|控除|社会保険/ },
        { intent: 'payroll_status',      re: /給与|給料|明細|月給|支払/ },
        { intent: 'grade_improve',       re: /評価.*(上げ|改善|よくし|アップ)|どうすれば.*グレード|グレード.*上/ },
        { intent: 'grade_status',        re: /評価|グレード|grade|半期|査定|スコア/ },
        { intent: 'dailyreport_write',   re: /日報.*(書|入力|提出)|書き.*日報/ },
        { intent: 'dailyreport',         re: /日報|デイリーレポート/ },
        { intent: 'rules',               re: /規定|ルール|就業|規則|ポリシー/ },
        { intent: 'board',               re: /掲示板|お知らせ|アナウンス|ニュース|連絡/ },
        { intent: 'team',                re: /メンバー|チーム|同僚|部下|上司|組織|誰が/ },
        { intent: 'approval_pending',    re: /承認.*待ち|承認.*(件|何件)|承認.*依頼|依頼.*承認/ },
        { intent: 'navigation',          re: /どこ|どうやって|どのページ|ページ|移動|アクセス|開き方|場所/ },
        { intent: 'weather',             re: /天気|気温|weather/ },
    ];
    for (const { intent, re } of patterns) { if (re.test(t)) return intent; }
    return 'unknown';
}

async function generateReply(intent, userId, employee, originalText, sessionContext) {
    const now        = jst();
    const monthStart = now.clone().startOf('month').toDate();
    const monthEnd   = now.clone().endOf('month').toDate();
    const sixMonthsAgo = now.clone().subtract(6, 'months').startOf('day').toDate();
    try {
        switch (intent) {

        case 'greeting': return {
            text: 'こんにちは、**' + employee.name + '** さん！\n\n' +
                  'わたしは **DXPRO AIアシスタント** です。\n\n' +
                  '📅 **勤怠** — 今日の打刻・今月のサマリー・残業・遅刻\n' +
                  '🎯 **目標** — 進捗確認・期限アラート・承認状況\n' +
                  '🏖 **休暇** — 申請状況・残日数・新規申請案内\n' +
                  '💴 **給与** — 最新明細・控除内訳\n' +
                  '⭐ **評価** — 半期グレード予測・改善アドバイス\n' +
                  '📝 **日報** — 提出状況・入力案内\n' +
                  '📋 **規定** — 就業規則・各種ポリシー\n' +
                  '📣 **掲示板** — 最新のお知らせ\n' +
                  '🗺 **ナビ** — 各ページへのリンク案内\n\n' +
                  '💡 「**今日の状況を教えて**」で全体サマリーを確認できます！',
            links: [{ label: 'ダッシュボード', url: '/dashboard' }, { label: '勤怠打刻', url: '/attendance-main' }],
            quickReplies: ['今日の状況は？', '今月の勤怠は？', '評価グレードは？', '休暇の状況は？']
        };

        case 'thanks': return {
            text: 'どういたしまして！😊\n他にご質問があればいつでも！',
            links: [], quickReplies: ['今日の勤怠は？', '何ができる？']
        };

        case 'time': case 'date': {
            const dow = ['日','月','火','水','木','金','土'][now.day()];
            return { text: '🕐 **現在の日時**\n\n' + now.format('YYYY年MM月DD日') + '（' + dow + '曜日）\n' + now.format('HH:mm'), links: [] };
        }

        case 'weather': return { text: '☁️ 申し訳ありません、天気情報には対応していません。\n気象庁などのサービスをご利用ください。', links: [] };

        case 'summary': {
            const ts = now.clone().startOf('day').toDate(), te = now.clone().endOf('day').toDate();
            const [todayRec, mRecs, gAll, lPend, aPend] = await Promise.all([
                Attendance.findOne({ userId, date: { $gte: ts, $lte: te } }),
                Attendance.find({ userId, date: { $gte: monthStart, $lt: monthEnd } }),
                Goal.find({ ownerId: employee._id }).lean(),
                LeaveRequest.countDocuments({ userId, status: 'pending' }),
                Goal.countDocuments({ currentApprover: employee._id, status: { $in: ['pending1','pending2'] } })
            ]);
            const ci  = todayRec && todayRec.checkIn  ? moment(todayRec.checkIn).tz('Asia/Tokyo').format('HH:mm') : null;
            const co  = todayRec && todayRec.checkOut ? moment(todayRec.checkOut).tz('Asia/Tokyo').format('HH:mm') : null;
            const lc  = mRecs.filter(a=>a.status==='遅刻').length;
            const ot  = Math.round(mRecs.reduce((s,a)=>s+(a.overtimeHours||0),0));
            const ga  = gAll.length ? Math.round(gAll.reduce((s,g)=>s+(g.progress||0),0)/gAll.length) : 0;
            const od  = gAll.filter(g=>g.deadline&&new Date(g.deadline)<new Date()&&g.status!=='completed').length;
            const ts2 = ci ? (co?'✅ 出勤 '+ci+' → 退勤 '+co:'✅ 出勤済み '+ci+'（退勤未打刻）') : '⚠️ 本日の打刻がまだありません';
            const al  = [];
            if (!ci) al.push('⚠️ 本日の打刻なし');
            if (lc>0) al.push('⚠️ 今月'+lc+'件の遅刻');
            if (od>0) al.push('🚨 期限超過の目標'+od+'件');
            if (lPend>0) al.push('🏖 休暇申請'+lPend+'件が承認待ち');
            if (aPend>0) al.push('📋 あなたへの承認依頼'+aPend+'件');
            return {
                text: '📊 **'+now.format('MM月DD日')+' の全体状況**\n\n' +
                      '**今日の勤怠：** '+ts2+'\n' +
                      '**今月：** 遅刻'+lc+'件  残業'+ot+'h\n' +
                      '**目標：** '+gAll.length+'件登録  平均進捗'+ga+'%'+(od>0?' ⚠️'+od+'件超過':' ✅')+'\n\n' +
                      (al.length>0 ? '**🔔 アラート：**\n'+al.join('\n') : '✅ 現在アラートはありません'),
                links: [{ label: 'ダッシュボード', url: '/dashboard' }, { label: '勤怠打刻', url: '/attendance-main' }],
                quickReplies: ['目標の詳細は？', '評価グレードは？', '今月の勤怠詳細']
            };
        }

        case 'attendance_today': {
            const ts3 = now.clone().startOf('day').toDate(), te3 = now.clone().endOf('day').toDate();
            const rec = await Attendance.findOne({ userId, date: { $gte: ts3, $lte: te3 } });
            if (!rec) return {
                text: '📅 **'+now.format('YYYY-MM-DD')+'（今日）** の勤怠記録はまだありません。\n\n打刻がお済みでない場合は下のリンクからどうぞ。',
                links: [{ label: '勤怠打刻ページへ', url: '/attendance-main' }],
                quickReplies: ['今月の勤怠は？', '打刻漏れを確認']
            };
            const ci2 = rec.checkIn  ? moment(rec.checkIn).tz('Asia/Tokyo').format('HH:mm') : '未打刻';
            const co2 = rec.checkOut ? moment(rec.checkOut).tz('Asia/Tokyo').format('HH:mm') : '未打刻';
            const hrs = rec.workingHours != null ? rec.workingHours + 'h' : '計算中';
            const ot2 = rec.overtimeHours ? rec.overtimeHours + 'h' : 'なし';
            const em  = rec.status==='遅刻'?'⚠️':rec.status==='早退'?'⚡':'✅';
            return {
                text: '📅 **今日（'+now.format('YYYY-MM-DD')+'）の勤怠**\n\n' +
                      em+' ステータス：**'+(rec.status||'正常')+'**\n' +
                      '• 出勤：'+ci2+'\n• 退勤：'+co2+'\n' +
                      '• 実働：'+hrs+'\n• 残業：'+ot2,
                links: [{ label: '勤怠詳細を確認', url: '/attendance-main' }],
                quickReplies: ['今月の勤怠は？', '残業の状況は？']
            };
        }

        case 'stamp_checkin': return {
            text: '🟢 **出勤打刻のご案内**\n\n打刻ページから「出勤」ボタンを押してください。',
            links: [{ label: '出勤打刻ページへ', url: '/attendance-main' }], quickReplies: ['今日の勤怠状況は？']
        };

        case 'stamp_checkout': return {
            text: '🔴 **退勤打刻のご案内**\n\nお疲れ様でした！打刻ページから「退勤」ボタンを押してください。',
            links: [{ label: '退勤打刻ページへ', url: '/attendance-main' }], quickReplies: ['今日の勤怠状況は？', '今月の残業時間は？']
        };

        case 'attendance_month': case 'attendance_late': case 'attendance_absent': case 'overtime': {
            const recs = await Attendance.find({ userId, date: { $gte: monthStart, $lt: monthEnd } });
            const wd = recs.filter(a=>a.status!=='欠勤').length;
            const lc2 = recs.filter(a=>a.status==='遅刻').length;
            const ec = recs.filter(a=>a.status==='早退').length;
            const ac = recs.filter(a=>a.status==='欠勤').length;
            const ot3 = Math.round(recs.reduce((s,a)=>s+(a.overtimeHours||0),0));
            let extra = '';
            if (intent==='attendance_late' && lc2>0) extra = '\n\n⚠️ 遅刻は評価の **時間厳守スコア** に影響します。\n💡 始業15分前に着席する習慣をつけましょう。';
            if (intent==='overtime' && ot3>=20) {
                const proj = Math.round(ot3 * now.daysInMonth() / now.date());
                extra = '\n\n🚨 このペースで月末には **'+proj+'h** になる見込みです。タスクの優先度を見直してください。';
            }
            return {
                text: '📊 **'+now.format('YYYY年MM月')+' の勤怠サマリー**\n\n' +
                      '• 出勤日数：**'+wd+'日**\n' +
                      '• 遅刻：'+lc2+'件'+(lc2>0?' ⚠️':' ✅')+'\n' +
                      '• 早退：'+ec+'件\n• 欠勤：'+ac+'日\n' +
                      '• 残業合計：**'+ot3+'h**'+extra,
                links: [{ label: '月次勤怠を確認', url: '/my-monthly-attendance' }, { label: '勤怠打刻', url: '/attendance-main' }],
                quickReplies: ['打刻漏れを確認', '評価への影響は？', '残業詳細']
            };
        }

        case 'stamp_missing': {
            const recsM = await Attendance.find({ userId, date: { $gte: monthStart, $lt: monthEnd } });
            const rd = new Set(recsM.map(a=>moment(a.date).format('YYYY-MM-DD')));
            const md = [];
            for (let d=1; d<=now.date(); d++) {
                const dt = now.clone().date(d);
                if (dt.day()===0||dt.day()===6) continue;
                if (!rd.has(dt.format('YYYY-MM-DD'))) md.push(dt.format('YYYY-MM-DD'));
            }
            if (md.length===0) return {
                text: '✅ 今月の平日（1日〜'+now.date()+'日）はすべて打刻済みです！打刻漏れはありません。',
                links: [], quickReplies: ['今月の勤怠サマリー', '今日の打刻状況']
            };
            return {
                text: '🔍 **打刻漏れの可能性があります**\n\n今月の平日（1〜'+now.date()+'日）のうち **'+md.length+'日分** の記録がありません。\n\n直近の未記録：\n' + md.slice(-3).map(d=>'• '+d).join('\n') + '\n\n打刻ページから追加入力してください。',
                links: [{ label: '勤怠を入力する', url: '/add-attendance' }], quickReplies: ['今日の打刻状況は？']
            };
        }

        case 'attendance_calendar': return {
            text: '📅 **勤怠カレンダー**\n\n月次勤怠ページで出勤状況をカレンダー形式で確認できます。',
            links: [{ label: '月次勤怠カレンダー', url: '/my-monthly-attendance' }], quickReplies: ['打刻漏れを確認', '今月のサマリーは？']
        };

        case 'goals_status': case 'goals_overdue': {
            const gl = await Goal.find({ ownerId: employee._id }).sort({ deadline: 1 }).lean();
            if (!gl || gl.length===0) return {
                text: '🎯 まだ目標が登録されていません。\n\n目標を登録すると半期評価が最大 **+30点** 向上します！',
                links: [{ label: '目標を登録する', url: '/goals/add' }], quickReplies: ['目標の作成方法は？', '評価グレードは？']
            };
            const tot = gl.length;
            const comp = gl.filter(g=>g.status==='completed'||(g.progress||0)>=100).length;
            const ov   = gl.filter(g=>g.deadline&&new Date(g.deadline)<new Date()&&g.status!=='completed').length;
            const inp  = gl.filter(g=>g.status==='approved1'||g.status==='pending2').length;
            const avg  = Math.round(gl.reduce((s,g)=>s+(g.progress||0),0)/tot);
            let ovd = '';
            if (ov>0) ovd = '\n\n⚠️ **期限超過：**\n' + gl.filter(g=>g.deadline&&new Date(g.deadline)<new Date()&&g.status!=='completed').slice(0,3).map(g=>'• '+g.title+'（'+(g.progress||0)+'%）').join('\n');
            const nd = gl.filter(g=>g.deadline&&new Date(g.deadline)>=new Date()&&g.status!=='completed').slice(0,2).map(g=>'• **'+g.title+'** — '+moment(g.deadline).format('MM/DD')).join('\n');
            return {
                text: '🎯 **目標の状況**\n\n' +
                      '• 登録数：'+tot+'件\n• 完了済み：**'+comp+'件** ✅\n' +
                      '• 進行中：'+inp+'件\n• 平均進捗：**'+avg+'%**\n' +
                      '• 期限超過：'+(ov>0?'**'+ov+'件** ⚠️':'なし ✅') + ovd + (nd?'\n\n📅 **次の期限：**\n'+nd:''),
                links: [{ label: '目標管理ページ', url: '/goals' }, { label: '新しい目標を作成', url: '/goals/add' }],
                quickReplies: ['評価グレードへの影響は？', '承認待ちの目標は？']
            };
        }

        case 'goals_create': return {
            text: '🎯 **目標の作成方法**\n\n「目標管理」ページから「新規作成」ボタンで作成できます。\n\n**作成の流れ：**\n1. 目標名・概要・アクションプランを入力\n2. 期限・目標レベル（低/中/高）を設定\n3. 一次承認者を選択\n4. 下書き保存 → 承認依頼',
            links: [{ label: '目標を作成する', url: '/goals/add' }], quickReplies: ['承認待ちの目標は？', '目標の現状は？']
        };

        case 'goals_approval': {
            const [pg, rg] = await Promise.all([
                Goal.find({ ownerId: employee._id, status: { $in: ['pending1','pending2'] } }).lean(),
                Goal.find({ ownerId: employee._id, status: 'rejected' }).lean()
            ]);
            return {
                text: '📋 **目標の承認状況**\n\n' +
                      '• 承認依頼中：'+pg.length+'件'+(pg.length>0?' ⏳':' ✅')+'\n' +
                      '• 差し戻し：'+rg.length+'件'+(rg.length>0?' ⚠️':' ✅') +
                      (rg.length>0?'\n\n差し戻された目標は修正して再申請してください。':''),
                links: [{ label: '目標管理ページ', url: '/goals' }], quickReplies: ['目標の進捗状況は？']
            };
        }

        case 'approval_pending': {
            const [gc, lc3] = await Promise.all([
                Goal.countDocuments({ currentApprover: employee._id, status: { $in: ['pending1','pending2'] } }),
                LeaveRequest.countDocuments({ approver: employee._id, status: 'pending' })
            ]);
            return {
                text: '📋 **あなたへの承認依頼**\n\n' +
                      '• 目標承認待ち：**'+gc+'件**'+(gc>0?' ⏳':' ✅')+'\n' +
                      '• 休暇承認待ち：**'+lc3+'件**'+(lc3>0?' ⏳':' ✅'),
                links: [{ label: '目標承認ページ', url: '/goals/approval' }, { label: '休暇承認ページ', url: '/leave/approve' }],
                quickReplies: ['自分の目標の状況は？']
            };
        }

        case 'leave_status': case 'leave_apply': {
            const [pL, aL, rL] = await Promise.all([
                LeaveRequest.countDocuments({ userId, status: 'pending' }),
                LeaveRequest.countDocuments({ userId, status: 'approved', startDate: { $gte: now.toDate() } }),
                LeaveRequest.find({ userId }).sort({ createdAt: -1 }).limit(3).lean()
            ]);
            let rd2 = '';
            if (rL.length>0) rd2 = '\n\n**直近の申請：**\n' + rL.map(l => {
                const st = l.status==='pending'?'⏳':l.status==='approved'?'✅':l.status==='rejected'?'❌':'?';
                return '• '+moment(l.startDate).format('MM/DD')+'〜'+moment(l.endDate).format('MM/DD')+' '+(l.leaveType||'')+' '+st;
            }).join('\n');
            return {
                text: '🏖 **休暇の状況**\n\n' +
                      '• 承認待ち：'+(pL>0?'**'+pL+'件** ⏳':'なし ✅')+'\n' +
                      '• 今後の予定（承認済）：'+aL+'件' + rd2 + (intent==='leave_apply'?'\n\n休暇申請ページから申請できます。':''),
                links: [{ label: '休暇申請一覧', url: '/leave/my-requests' }, { label: '休暇を申請する', url: '/leave/apply' }],
                quickReplies: ['今月の欠勤は？', '評価グレードは？']
            };
        }

        case 'payroll_status': case 'payroll_breakdown': {
            const slips = await PayrollSlip.find({ employeeId: employee._id }).sort({ createdAt: -1 }).limit(3).lean();
            if (!slips||slips.length===0) return { text: '💴 給与明細がまだありません。\n\n管理者が給与処理を実行すると明細が表示されます。', links: [{ label: '給与明細ページへ', url: '/hr/payroll' }] };
            const lat = slips[0];
            const sl = {draft:'下書き',issued:'発行済',locked:'確定',paid:'支払済'}[lat.status]||lat.status;
            let bdt = '';
            if (intent==='payroll_breakdown' && lat.deductions && lat.deductions.length>0) {
                bdt = '\n\n**控除内訳：**\n' + lat.deductions.slice(0,4).map(d=>'  • '+d.name+'：¥'+(d.amount||0).toLocaleString()).join('\n');
            }
            return {
                text: '💴 **給与明細の状況**\n\n' +
                      '• 最新明細：**¥'+(lat.net||0).toLocaleString()+'**（'+sl+'）\n' +
                      '• 総支給：¥'+(lat.gross||0).toLocaleString()+'\n' +
                      '• 控除合計：¥'+((lat.gross||0)-(lat.net||0)).toLocaleString()+'\n' +
                      '• 明細件数：'+slips.length+'件'+bdt,
                links: [{ label: '給与明細を確認', url: '/hr/payroll' }], quickReplies: ['控除の内訳は？', '評価グレードは？']
            };
        }

        case 'grade_status': case 'grade_improve': {
            // ダッシュボードと同じ computeSemiAnnualGrade() を使用して値を統一
            const semi = await computeSemiAnnualGrade(userId, employee);
            const { grade: gr, score: tot2, breakdown } = semi;
            const bd = breakdown || {};
            const atScore = bd.attendanceScore ?? 0;
            const goScore = bd.goalScore      ?? 0;
            const quScore = bd.qualityScore ?? bd.payrollScore ?? 0;
            const otScore = bd.overtimeScore  ?? 0;
            const lvScore = bd.leaveScore     ?? 0;

            // 8段階グレード体系での次グレード計算
            const gradeThresholds = { 'S+': null, 'S': 96, 'A+': 88, 'A': 78, 'B+': 67, 'B': 55, 'C': 43, 'D': 28 };
            const gradeNames = ['S+','S','A+','A','B+','B','C','D'];
            const grIdx = gradeNames.indexOf(gr);
            const nextGradeName  = grIdx > 0 ? gradeNames[grIdx - 1] : null;
            const nextGradeScore = nextGradeName ? gradeThresholds[nextGradeName] : null;
            const remaining = nextGradeScore ? nextGradeScore - tot2 : 0;

            // 改善アドバイス（actionsから上位3件を抜粋）
            let ia = '';
            if (intent === 'grade_improve' || !['S+','S'].includes(gr)) {
                const tips = (semi.actions || [])
                    .slice(0, 3)
                    .map(a => '✅ ' + a.title + (a.detail ? '（' + a.detail.substring(0, 40) + '）' : ''));
                if (tips.length > 0) ia = '\n\n💡 **改善アドバイス：**\n' + tips.join('\n');
            }

            return {
                text: '⭐ **AI 半期評価予測**\n\n' +
                      '• 予測グレード：**GRADE ' + gr + '** 🏅\n' +
                      '• 推定スコア：**' + tot2 + '点** / 100点\n\n' +
                      '**内訳（5カテゴリ）：**\n' +
                      '• 出勤・時間管理：' + atScore + '/28点\n' +
                      '• 目標管理：' + goScore + '/32点\n' +
                      '• 業務品質：' + quScore + '/16点\n' +
                      '• 残業管理：' + otScore + '/12点\n' +
                      '• 休暇管理：' + lvScore + '/12点\n\n' +
                      (nextGradeScore && remaining > 0
                        ? '📈 あと **' + remaining + '点** でグレード **' + nextGradeName + '** 到達！'
                        : gr === 'S+' ? '🏆 最高グレード S+ を達成中！' : 'グレードアップまで頑張りましょう！') + ia,
                links: [{ label: 'ダッシュボードで詳細確認', url: '/dashboard' }],
                quickReplies: ['改善方法を教えて', '目標の状況は？', '今月の勤怠は？']
            };
        }

        case 'dailyreport': case 'dailyreport_write': {
            const ts4 = now.clone().startOf('day').toDate(), te4 = now.clone().endOf('day').toDate();
            const ws  = now.clone().startOf('week').toDate();
            const [dr, wc] = await Promise.all([
                DailyReport.findOne({ employeeId: employee._id, reportDate: { $gte: ts4, $lte: te4 } }),
                DailyReport.countDocuments({ employeeId: employee._id, reportDate: { $gte: ws } })
            ]);
            return {
                text: dr ? '📝 **今日の日報**は提出済み ✅\n今週の提出数：'+wc+'件\n\n**内容プレビュー：**\n'+dr.content.substring(0,100)+(dr.content.length>100?'…':'')
                         : '📝 **今日の日報はまだ提出されていません。**\n今週の提出数：'+wc+'件\n\n業務終了前に提出しましょう！',
                links: [{ label: '日報を入力する', url: '/hr/daily-report' }], quickReplies: ['今日の勤怠状況は？']
            };
        }

        case 'rules': {
            const rules = await CompanyRule.find().sort({ order: 1 }).limit(5).lean();
            if (!rules||rules.length===0) return { text: '📋 会社規定はまだ登録されていません。', links: [{ label: '規定ページへ', url: '/rules' }] };
            return {
                text: '📋 **会社規定・就業規則**\n\n' + rules.map(r=>'• **'+r.category+'** — '+r.title).join('\n') + '\n\n詳細は規定ページをご確認ください。',
                links: [{ label: '規定ページへ', url: '/rules' }], quickReplies: ['休暇の申請方法は？', '残業のルールは？']
            };
        }

        case 'board': {
            let bt = '📣 **社内掲示板**\n\n最新のお知らせは掲示板ページでご確認ください。';
            try {
                const { Post } = require('../models');
                if (Post) {
                    const recent = await Post.find().sort({ createdAt: -1 }).limit(3).lean();
                    if (recent && recent.length>0) bt = '📣 **社内掲示板の最新情報**\n\n' + recent.map(p=>'• **'+p.title+'**（'+moment(p.createdAt).format('MM/DD')+'）').join('\n') + '\n\n詳細は掲示板ページへ。';
                }
            } catch(_) {}
            return { text: bt, links: [{ label: '社内掲示板へ', url: '/board' }], quickReplies: ['規定を確認したい', 'ナビを見せて'] };
        }

        case 'team': {
            const mbs = await Employee.find({ isActive: { $ne: false } }).sort({ name: 1 }).limit(10).lean();
            return {
                text: '👥 **チームメンバー（'+mbs.length+'名）**\n\n' + mbs.map(e=>'• '+e.name+(e.position?' ('+e.position+')':'')).join('\n'),
                links: [{ label: '人事管理ページ', url: '/hr' }], quickReplies: ['承認依頼の状況は？']
            };
        }

        case 'navigation': {
            const ni = [
                { kw: /ダッシュボード|トップ|ホーム/, label: 'ダッシュボード',   url: '/dashboard' },
                { kw: /勤怠|打刻/,                    label: '勤怠打刻',         url: '/attendance-main' },
                { kw: /月次|月間.*勤怠/,               label: '月次勤怠',         url: '/my-monthly-attendance' },
                { kw: /目標/,                         label: '目標管理',         url: '/goals' },
                { kw: /休暇/,                         label: '休暇申請',         url: '/leave/apply' },
                { kw: /給与|明細/,                     label: '給与明細',         url: '/hr/payroll' },
                { kw: /日報/,                         label: '日報入力',         url: '/hr/daily-report' },
                { kw: /掲示板/,                       label: '社内掲示板',       url: '/board' },
                { kw: /規定|ルール/,                   label: '会社規定',         url: '/rules' },
                { kw: /人事|社員|メンバー/,            label: '人事管理',         url: '/hr' },
            ];
            const t2 = originalText.toLowerCase();
            const mt = ni.filter(n=>n.kw.test(t2));
            if (mt.length>0) return { text: '🗺 **ページのご案内**\n\n' + mt.map(n=>'• **'+n.label+'** ↓').join('\n'), links: mt.map(n=>({ label: n.label, url: n.url })) };
            return { text: '🗺 **主要ページのご案内**\n\n' + ni.map(n=>'• **'+n.label+'**').join('\n') + '\n\nどのページへ行きたいですか？', links: ni.map(n=>({ label: n.label, url: n.url })) };
        }

        default: {
            const ft = originalText;
            if (/勤怠|打刻|出勤|退勤/.test(ft)) return generateReply('attendance_today', userId, employee, originalText, sessionContext);
            if (/目標|ゴール/.test(ft))           return generateReply('goals_status', userId, employee, originalText, sessionContext);
            if (/休暇|有給|休み/.test(ft))         return generateReply('leave_status', userId, employee, originalText, sessionContext);
            if (/給与|給料|明細/.test(ft))         return generateReply('payroll_status', userId, employee, originalText, sessionContext);
            if (/評価|グレード|スコア/.test(ft))   return generateReply('grade_status', userId, employee, originalText, sessionContext);
            return {
                text: '🤔 ご質問の内容が確認できませんでした。\n\n以下のように聞いてみてください：\n\n• 「今日の勤怠状況は？」\n• 「今月の遅刻は何回？」\n• 「目標の進捗を教えて」\n• 「休暇の申請状況は？」\n• 「評価グレードを教えて」\n• 「給与明細を確認したい」\n• 「打刻漏れがないか確認して」\n• 「今日の全体状況まとめて」',
                links: [], quickReplies: ['今日の状況は？', '目標の進捗は？', '評価グレードは？', '何ができる？']
            };
        }
        }
    } catch(err) {
        console.error('chatbot generateReply error:', err);
        return { text: '⚠️ データ取得中にエラーが発生しました。しばらくしてから再度お試しください。', links: [] };
    }
}

router.post('/api/chatbot', requireLogin, async (req, res) => {
    try {
        const { message, context: sessionContext } = req.body;
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.json({ ok: false, error: 'メッセージを入力してください' });
        }
        const text = message.trim().substring(0, 500);
        const user     = await User.findById(req.session.userId);
        const employee = await Employee.findOne({ userId: user._id });
        if (!employee) return res.json({ ok: false, error: '従業員情報が見つかりません' });
        const intent = classifyIntent(text);
        const reply  = await generateReply(intent, user._id, employee, text, sessionContext || {});
        return res.json({ ok: true, reply, intent });
    } catch(err) {
        console.error('chatbot error:', err);
        return res.status(500).json({ ok: false, error: 'サーバーエラー' });
    }
});

module.exports = router;
