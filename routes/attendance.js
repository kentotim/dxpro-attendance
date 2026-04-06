// ==============================
// routes/attendance.js - 勤怠管理
// ==============================
const router = require('express').Router();
const moment = require('moment-timezone');
const { User, Employee, Attendance, ApprovalRequest } = require('../models');
const { requireLogin } = require('../middleware/auth');
const { escapeHtml } = require('../lib/helpers');

router.get('/attendance-main', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const employee = await Employee.findOne({ userId: user._id });

        if (!employee) {
            return res.status(400).send(`
                <div style="text-align:center; padding:50px; font-family:'Segoe UI', sans-serif;">
                    <h2>エラー: 従業員情報なし</h2>
                    <p>管理者に問い合わせて従業員情報を登録してください</p>
                    <a href="/logout" style="display:inline-block; padding:12px 20px; background:#0984e3; color:#fff; border-radius:6px; text-decoration:none;">ログアウト</a>
                </div>
            `);
        }

        const today = moment().tz('Asia/Tokyo').startOf('day').toDate();
        const tomorrow = moment(today).add(1, 'day').toDate();

        const todayAttendance = await Attendance.findOne({
            userId: user._id,
            date: { $gte: today, $lt: tomorrow }
        }).sort({ checkIn: 1 });

        const firstDayOfMonth = moment().tz('Asia/Tokyo').startOf('month').toDate();
        // 上限は次月の1日を排他的に使う（$lt）ことで、タイムゾーン/時刻丸めにより月初のレコードが抜ける問題を防ぐ
        const firstDayOfNextMonth = moment(firstDayOfMonth).add(1, 'month').toDate();

        const monthlyAttendance = await Attendance.find({
            userId: user._id,
            date: { $gte: firstDayOfMonth, $lt: firstDayOfNextMonth }
        }).sort({ date: 1 });

        // 新デザインの HTML
        res.send(`
<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>勤怠管理 - ${employee.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
<style>
:root{
  --bg:#f4f7fb;
  --card:#ffffff;
  --muted:#6b7280;
  --accent:#0f6fff;
  --success:#16a34a;
  --danger:#ef4444;
  --glass: rgba(255,255,255,0.6);
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
}
*{box-sizing:border-box}
body{margin:0;background:linear-gradient(180deg,var(--bg),#ffffff);color:#0f172a;font-size:14px; -webkit-font-smoothing:antialiased}
.header{
  display:flex;align-items:center;justify-content:space-between;padding:18px 28px;background:var(--card);
  box-shadow:0 6px 18px rgba(15,31,64,0.06);border-bottom:1px solid rgba(15,23,42,0.04);
}
.brand{display:flex;align-items:center;gap:14px}
.brand img{width:48px;height:48px;border-radius:8px;object-fit:cover}
.brand .title{font-weight:700;font-size:18px;color:var(--accent)}
.header-right{display:flex;align-items:center;gap:14px}
.user-info{display:flex;flex-direction:column;text-align:right}
.user-info .name{font-weight:700}
.clock{font-variant-numeric:tabular-nums;color:var(--muted);font-size:13px}

.container{max-width:1200px;margin:28px auto;padding:0 20px}
.grid{display:grid;grid-template-columns:1fr 360px;gap:20px}
@media(max-width:980px){ .grid{grid-template-columns:1fr} .aside{order:2} }

.panel{background:var(--card);border-radius:12px;padding:18px;box-shadow:0 8px 30px rgba(12,20,40,0.04);border:1px solid rgba(15,23,42,0.03)}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:18px}
@media(max-width:900px){ .kpis{grid-template-columns:repeat(2,1fr)} }
.kpi{padding:14px;border-radius:10px;background:linear-gradient(180deg,#fff,#fbfdff);display:flex;flex-direction:column;gap:8px}
.kpi .label{color:var(--muted);font-size:12px}
.kpi .value{font-weight:800;font-size:20px;color:#0b1220}
.kpi .sub{font-size:12px;color:var(--muted)}

.attendance-today{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.clock-card{flex:1;min-width:220px;padding:18px;border-radius:12px;background:linear-gradient(90deg,#eef6ff,#ffffff);display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.clock-card .time{font-size:28px;font-weight:800;color:var(--accent)}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;border:none;cursor:pointer;font-weight:600}
.btn--primary{background:linear-gradient(90deg,var(--accent),#184df2);color:white;box-shadow:0 8px 18px rgba(15,111,255,0.12)}
.btn--success{background:linear-gradient(90deg,var(--success),#05b075);color:white}
.btn--danger{background:linear-gradient(90deg,#ff7b7b,var(--danger));color:white}
.btn--ghost{background:transparent;border:1px solid #e6eefb;color:var(--accent)}

.info-list{display:flex;gap:12px;flex:1;flex-wrap:wrap}
.info-item{min-width:140px;background:linear-gradient(180deg,#fff,#fbfdff);padding:12px;border-radius:10px;box-shadow:0 6px 18px rgba(12,20,40,0.04)}
.info-item .name{font-weight:700}
.info-item .muted{color:var(--muted);font-size:12px;margin-top:6px}

.table-wrap{overflow:auto;border-radius:8px;margin-top:12px}
table.att-table{width:100%;border-collapse:collapse;min-width:800px}
.att-table thead th{background:#0b1220;color:#fff;padding:12px;text-align:center;font-weight:700;font-size:13px}
.att-table tbody td{background:linear-gradient(180deg,#fff,#fbfdff);padding:12px;text-align:center;border-bottom:1px solid rgba(12,20,40,0.04)}
.att-table tbody tr:hover td{background:#f6fbff}
.tag{display:inline-block;padding:6px 8px;border-radius:999px;font-size:12px;color:#fff}
.tag--normal{background:var(--success)}
.tag--late{background:#ffb020}
.tag--early{background:#ff6b6b}
.tag--absent{background:#9ca3af}
.note-cell{max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.aside .panel{position:sticky;top:20px}
.quick-links{display:flex;flex-direction:column;gap:8px}
.link-card{display:flex;justify-content:space-between;align-items:center;padding:12px;border-radius:10px;background:linear-gradient(180deg,#fff,#fbfdff);cursor:pointer;border:1px solid rgba(12,20,40,0.03)}
.link-card small{color:var(--muted)}
.footer-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;justify-content:flex-end}

.empty-state{padding:32px;text-align:center;color:var(--muted)}

@media(max-width:520px){
  .kpis{grid-template-columns:repeat(2,1fr)}
  .info-item{min-width:120px}
}
</style>
</head>
<body>
<header class="header">
  <div class="brand">
    <img src="/nokori.png" alt="DXPRO">
    <div>
      <div class="title">DXPRO SOLUTIONS</div>
      <div style="color:var(--muted);font-size:13px">勤怠管理システム</div>
    </div>
  </div>
  <div class="header-right">
    <div class="user-info">
      <div class="name">${employee.name}（${employee.employeeId}）</div>
      <div class="clock" id="header-clock">${moment().tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm:ss')}</div>
    </div>
    <div style="width:12px"></div>
    <a href="/dashboard" class="btn btn--ghost" title="ダッシュボード"><i class="fa-solid fa-house"></i></a>
    <a href="/logout" class="btn btn--ghost" title="ログアウト"><i class="fa-solid fa-right-from-bracket"></i></a>
  </div>
</header>

<main class="container">
  <div class="grid">
    <section>
      <div class="panel">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div>
            <h3 style="margin:0">本日の勤怠</h3>
            <div style="color:var(--muted);font-size:13px">迅速に打刻・編集できます</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <a href="/add-attendance" class="btn btn--ghost"><i class="fa-solid fa-plus"></i> 打刻追加</a>
            <a href="/attendance/bulk-register?year=${moment().tz('Asia/Tokyo').year()}&month=${moment().tz('Asia/Tokyo').month()+1}" class="btn btn--ghost"><i class="fa-solid fa-calendar-check"></i> 一括登録</a>
            ${req.session.isAdmin ? `<a href="/admin/monthly-attendance" class="btn btn--ghost">管理メニュー</a>` : ''}
          </div>
        </div>

        <div class="kpis">
          <div class="kpi">
            <div class="label">出勤</div>
            <div class="value">${todayAttendance && todayAttendance.checkIn ? moment(todayAttendance.checkIn).tz('Asia/Tokyo').format('HH:mm:ss') : '-'}</div>
            <div class="sub">出勤時間</div>
          </div>
          <div class="kpi">
            <div class="label">退勤</div>
            <div class="value">${todayAttendance && todayAttendance.checkOut ? moment(todayAttendance.checkOut).tz('Asia/Tokyo').format('HH:mm:ss') : '-'}</div>
            <div class="sub">退勤時間</div>
          </div>
          <div class="kpi">
            <div class="label">勤務時間</div>
            <div class="value">${todayAttendance && todayAttendance.workingHours ? (todayAttendance.workingHours + ' h') : '-'}</div>
            <div class="sub">昼休みを除く</div>
          </div>
          <div class="kpi">
            <div class="label">状態</div>
            <div class="value">${todayAttendance ? todayAttendance.status : '-'}</div>
            <div class="sub">勤怠ステータス</div>
          </div>
        </div>

        <div class="attendance-today">
          <div class="clock-card">
            <div style="display:flex;justify-content:space-between;width:100%;align-items:center">
              <div>
                <div style="color:var(--muted);font-size:13px">現在時刻（JST）</div>
                <div class="time" id="main-clock">${moment().tz('Asia/Tokyo').format('HH:mm:ss')}</div>
                <div style="color:var(--muted);font-size:13px;margin-top:6px">${moment().tz('Asia/Tokyo').format('YYYY年MM月DD日')}</div>
              </div>
              <div style="text-align:right">
                ${todayAttendance ? `
                  ${todayAttendance.checkOut ? `<span class="tag tag--normal">退勤済</span>` : `<span class="tag tag--late">${todayAttendance.status}</span>`}
                ` : `<span class="tag tag--absent">未打刻</span>`}
              </div>
            </div>

            <div class="actions">
              ${todayAttendance ? `
                ${!todayAttendance.checkOut ? `<form action="/checkout" method="POST" style="display:inline"><button class="btn btn--danger" type="submit"><i class="fa-solid fa-sign-out-alt"></i> 退勤</button></form>` : ''}
                ${todayAttendance.checkIn && (!todayAttendance.lunchStart || todayAttendance.lunchEnd) ? `
                  <form action="/start-lunch" method="POST" style="display:inline"><button class="btn btn--primary" type="submit"><i class="fa-solid fa-utensils"></i> 昼休み開始</button></form>
                ` : ''}
                ${todayAttendance.lunchStart && !todayAttendance.lunchEnd ? `
                  <form action="/end-lunch" method="POST" style="display:inline"><button class="btn btn--success" type="submit"><i class="fa-solid fa-handshake"></i> 昼休み終了</button></form>
                ` : ''}
                <a href="/edit-attendance/${todayAttendance._id}" class="btn btn--ghost">編集</a>
              ` : `
                <form action="/checkin" method="POST" style="display:inline">
                  <button class="btn btn--primary" type="submit"><i class="fa-solid fa-sign-in-alt"></i> 出勤</button>
                </form>
              `}
            </div>
          </div>

          <div class="info-list">
            <div class="info-item">
              <div class="name">${todayAttendance && todayAttendance.totalHours ? (todayAttendance.totalHours + ' h') : '-'}</div>
              <div class="muted">滞在時間</div>
            </div>
            <div class="info-item">
              <div class="name">${todayAttendance && todayAttendance.lunchStart ? moment(todayAttendance.lunchStart).tz('Asia/Tokyo').format('HH:mm') : '-'}</div>
              <div class="muted">昼休み開始</div>
            </div>
            <div class="info-item">
              <div class="name">${todayAttendance && todayAttendance.lunchEnd ? moment(todayAttendance.lunchEnd).tz('Asia/Tokyo').format('HH:mm') : '-'}</div>
              <div class="muted">昼休み終了</div>
            </div>
            <div class="info-item">
              <div class="name">${monthlyAttendance.length}</div>
              <div class="muted">今月の記録</div>
            </div>
          </div>
        </div>

      </div>

      <div class="panel" style="margin-top:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h4 style="margin:0">今月の勤怠一覧</h4>
          <div style="color:var(--muted);font-size:13px">編集・印刷は各行の操作から</div>
        </div>

        <div class="table-wrap">
          <table class="att-table" aria-label="今月の勤怠">
            <thead>
              <tr>
                <th>日付</th>
                <th>出勤</th>
                <th>退勤</th>
                <th>昼休憩</th>
                <th>勤務時間</th>
                <th>状態</th>
                <th>備考</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyAttendance.map(record => {
                  const lunch = record.lunchStart ? `${moment(record.lunchStart).tz('Asia/Tokyo').format('HH:mm')}～${record.lunchEnd ? moment(record.lunchEnd).tz('Asia/Tokyo').format('HH:mm') : '-'}` : '-';
                  const statusClass = record.status === '正常' ? 'tag--normal' : record.status === '遅刻' ? 'tag--late' : record.status === '早退' ? 'tag--early' : 'tag--absent';
                  return `
                    <tr>
                      <td>${moment(record.date).tz('Asia/Tokyo').format('MM/DD')}</td>
                      <td>${record.checkIn ? moment(record.checkIn).tz('Asia/Tokyo').format('HH:mm') : '-'}</td>
                      <td>${record.checkOut ? moment(record.checkOut).tz('Asia/Tokyo').format('HH:mm') : '-'}</td>
                      <td>${lunch}</td>
                      <td>${record.workingHours ? record.workingHours + ' h' : '-'}</td>
                      <td><span class="tag ${statusClass}">${record.status}</span></td>
                      <td class="note-cell">${record.notes || '-'}</td>
                      <td>
                        <a class="btn btn--ghost" href="/edit-attendance/${record._id}">編集</a>
                      </td>
                    </tr>
                  `;
              }).join('')}

              ${monthlyAttendance.length === 0 ? `
                <tr><td colspan="8"><div class="empty-state">該当する勤怠記録がありません</div></td></tr>
              ` : ''}
            </tbody>
          </table>
        </div>

      </div>
    </section>

    <aside class="aside">
      <div class="panel">
        <h4 style="margin-top:0">クイック操作</h4>
        <div class="quick-links">
          <a class="link-card" href="/my-monthly-attendance?year=${moment().tz('Asia/Tokyo').year()}&month=${moment().tz('Asia/Tokyo').month()+1}">
            <div>
              <div style="font-weight:700">月別勤怠</div>
              <small>詳細・承認リクエスト</small>
            </div>
            <div><i class="fa-solid fa-file-lines" style="color:var(--accent)"></i></div>
          </a>

          <a class="link-card" href="/leave/apply">
            <div>
              <div style="font-weight:700">休暇申請</div>
              <small>申請・履歴確認</small>
            </div>
            <div><i class="fa-solid fa-plane-departure" style="color:#f59e0b"></i></div>
          </a>

          <a class="link-card" href="/goals">
            <div>
              <div style="font-weight:700">目標管理</div>
              <small>進捗・承認</small>
            </div>
            <div><i class="fa-solid fa-bullseye" style="color:#10b981"></i></div>
          </a>
        </div>

        <div class="footer-actions">
          <a href="/change-password" class="btn btn--ghost">パスワード変更</a>
          <a href="/dashboard" class="btn btn--ghost">ダッシュボードへ</a>
        </div>
      </div>

      <div class="panel" style="margin-top:12px">
        <h4 style="margin-top:0">ヘルプ & ポリシー</h4>
        <p style="color:var(--muted);font-size:13px">打刻に関する問い合わせや就業規則は人事までご連絡ください。</p>
        <a href="https://dxpro-sol.com" target="_blank" class="btn btn--ghost" style="width:100%;margin-top:8px">社内ポータル</a>
      </div>
    </aside>
  </div>
</main>

<script>
  function updateClocks(){
    const d = new Date();
    const opts = { hour12:false, timeZone:'Asia/Tokyo' };
    const t = new Date().toLocaleTimeString('ja-JP', opts);
    document.getElementById('main-clock').textContent = t;
    document.getElementById('header-clock').textContent = new Date().toLocaleString('ja-JP', { timeZone:'Asia/Tokyo' });
  }
  setInterval(updateClocks,1000);
  window.onload = updateClocks;
</script>
</body>
</html>
        `);

    } catch (error) {
        console.error(error);
        res.status(500).send('サーバーエラー');
    }
});

// 패스워드 변경 페이지 라우트 (GET)
router.get('/edit-attendance/:id', requireLogin, async (req, res) => {
    try {
        const attendance = await Attendance.findById(req.params.id);
        if (!attendance) return res.redirect('/attendance-main');

        // 承認リクエスト中か確認
        const year = attendance.date.getFullYear();
        const month = attendance.date.getMonth() + 1;

        const approvalRequest = await ApprovalRequest.findOne({
            userId: req.session.userId,
            year: year,
            month: month,
            status: 'pending'
        });

        if (attendance.isConfirmed || approvalRequest) {
            return res.send(`
                <div class="container">
                    <h2>エラー</h2>
                    <p>この勤怠記録は${attendance.isConfirmed ? '承認済み' : '承認リクエスト中'}のため編集できません</p>
                    <a href="/dashboard" class="btn">ダッシュボードに戻る</a>
                </div>
            `);
        }

        function formatDateTimeForInput(date) {
            if (!date) return '';
            // JSTとして表示
            return moment(date).tz('Asia/Tokyo').format('HH:mm');
        }

        const dateValue = moment(attendance.date).tz('Asia/Tokyo').format('YYYY-MM-DD');

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>勤怠記録編集</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <link rel="stylesheet" href="/styles.css">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/flatpickr/4.6.13/flatpickr.min.css">
                <script src="https://cdnjs.cloudflare.com/ajax/libs/flatpickr/4.6.13/flatpickr.min.js"></script>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/flatpickr/4.6.13/l10n/ja.min.js"></script>
                <script>
                    document.addEventListener('DOMContentLoaded', function() {
                        flatpickr.localize(flatpickr.l10ns.ja);
                        
                        // 日付ピッカー設定
                        flatpickr("#date", {
                            dateFormat: "Y-m-d",
                            locale: "ja"
                        });
                        
                        // 時間ピッカー設定
                        const timeConfig = {
                            enableTime: true,
                            noCalendar: true,
                            dateFormat: "H:i",
                            time_24hr: true,
                            locale: "ja"
                        };
                        
                        flatpickr("#checkIn", timeConfig);
                        flatpickr("#lunchStart", timeConfig);
                        flatpickr("#lunchEnd", timeConfig);
                        flatpickr("#checkOut", timeConfig);

                        // クライアントサイドバリデーション
                        document.querySelector('form').addEventListener('submit', function(e) {
                            const date = document.getElementById('date').value;
                            const checkIn = document.getElementById('checkIn").value;
                            const checkOut = document.getElementById('checkOut").value;
                            const lunchStart = document.getElementById('lunchStart").value;
                            const lunchEnd = document.getElementById('lunchEnd").value;
                            
                            // 必須チェック
                            if (!date || !checkIn) {
                                e.preventDefault();
                                alert('日付と出勤時間は必須入力です');
                                return false;
                            }
                            
                            // 退勤時間がある場合は出勤時間より後か確認
                            if (checkOut && checkOut <= checkIn) {
                                e.preventDefault();
                                alert('退勤時間は出勤時間より後にしてください');
                                return false;
                            }
                            
                            // 昼休み時間の整合性チェック
                            if ((lunchStart && !lunchEnd) || (!lunchStart && lunchEnd)) {
                                e.preventDefault();
                                alert('昼休み開始と終了の両方を入力してください');
                                return false;
                            }
                            
                            if (lunchStart && lunchEnd && lunchEnd <= lunchStart) {
                                e.preventDefault();
                                alert('昼休み終了時間は開始時間より後にしてください');
                                return false;
                            }
                            
                            return true;
                        });
                    });
                </script>
            </head>
            <body>
                <div class="container">
                    <h2>勤怠記録編集</h2>
                    <form action="/update-attendance/${attendance._id}" method="POST">
                        <div class="form-group">
                            <label for="date">日付:</label>
                            <input type="date" id="date" name="date" 
                                value="${dateValue}" required>
                        </div>
                        <div class="form-group">
                            <label for="checkIn">出勤時間:</label>
                            <input type="text" id="checkIn" name="checkIn" 
                                   value="${formatDateTimeForInput(attendance.checkIn)}" required>
                        </div>
                        <div class="form-group">
                            <label for="lunchStart">昼休み開始時間:</label>
                            <input type="text" id="lunchStart" name="lunchStart" 
                                   value="${attendance.lunchStart ? formatDateTimeForInput(attendance.lunchStart) : ''}">
                        </div>
                        <div class="form-group">
                            <label for="lunchEnd">昼休み終了時間:</label>
                            <input type="text" id="lunchEnd" name="lunchEnd" 
                                   value="${attendance.lunchEnd ? formatDateTimeForInput(attendance.lunchEnd) : ''}">
                        </div>
                        <div class="form-group">
                            <label for="checkOut">退勤時間:</label>
                            <input type="text" id="checkOut" name="checkOut" 
                                   value="${attendance.checkOut ? formatDateTimeForInput(attendance.checkOut) : ''}">
                        </div>
                        <div class="form-group">
                            <label for="status">状態:</label>
                            <select id="status" name="status">
                                <option value="正常" ${attendance.status === '正常' ? 'selected' : ''}>正常</option>
                                <option value="遅刻" ${attendance.status === '遅刻' ? 'selected' : ''}>遅刻</option>
                                <option value="早退" ${attendance.status === '早退' ? 'selected' : ''}>早退</option>
                                <option value="欠勤" ${attendance.status === '欠勤' ? 'selected' : ''}>欠勤</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="notes">備考:</label>
                            <textarea id="notes" name="notes" rows="3">${attendance.notes || ''}</textarea>
                        </div>                        
                        <button type="submit" class="btn">更新</button>
                        <a href="/dashboard" class="btn cancel-btn">キャンセル</a>
                    </form>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error(error);
        res.redirect('/attendance-main');
    }
});

// 勤怠更新処理 - 修正版
router.post('/update-attendance/:id', requireLogin, async (req, res) => {
    try {
        const attendance = await Attendance.findById(req.params.id);
        if (!attendance) return res.redirect('/attendance-main');
        
        // 확정된 근태는 수정 불가
        if (attendance.isConfirmed) {
            return res.status(403).send('承認済みの勤怠記録は編集できません');
        }
        
        function parseTimeAsJST(dateStr, timeStr) {
            if (!dateStr || !timeStr) return null;
            return moment.tz(`${dateStr} ${timeStr}`, 'YYYY-MM-DD HH:mm', 'Asia/Tokyo').toDate();
        }

        // 日付と時間を正しく結合
        const dateParts = req.body.date.split('-');
        const newDate = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
        const checkInTime = req.body.checkIn.split(':');
        const checkOutTime = req.body.checkOut ? req.body.checkOut.split(':') : null;
        const lunchStartTime = req.body.lunchStart ? req.body.lunchStart.split(':') : null;
        const lunchEndTime = req.body.lunchEnd ? req.body.lunchEnd.split(':') : null;

        // 日付を更新 (時間部分は保持)
        newDate.setHours(0, 0, 0, 0);

        // 各時刻を新しい日付に設定
        attendance.date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        attendance.checkIn = parseTimeAsJST(req.body.date, req.body.checkIn);
        attendance.checkOut = parseTimeAsJST(req.body.date, req.body.checkOut);
        attendance.lunchStart = parseTimeAsJST(req.body.date, req.body.lunchStart);
        attendance.lunchEnd = parseTimeAsJST(req.body.date, req.body.lunchEnd);
        attendance.status = req.body.status;
        attendance.notes = req.body.notes || null;
      
        // 勤務時間再計算
        if (attendance.checkOut) {
            const totalMs = attendance.checkOut - attendance.checkIn;
            let lunchMs = 0;
            
            if (attendance.lunchStart && attendance.lunchEnd) {
                lunchMs = attendance.lunchEnd - attendance.lunchStart;
            }
            
            const workingMs = totalMs - lunchMs;
            
            attendance.workingHours = parseFloat((workingMs / (1000 * 60 * 60)).toFixed(1));
            attendance.totalHours = parseFloat((totalMs / (1000 * 60 * 60)).toFixed(1));
        }
        
        await attendance.save();
        
        // 更新後のデータを確認
        console.log('更新後の勤怠データ:', {
            date: attendance.date,
            checkIn: attendance.checkIn,
            checkOut: attendance.checkOut,
            lunchStart: attendance.lunchStart,
            lunchEnd: attendance.lunchEnd,
            workingHours: attendance.workingHours,
            status: attendance.status
        });
        
        res.redirect('/attendance-main');
    } catch (error) {
        console.error('勤怠更新エラー:', error);
        res.redirect('/attendance-main');
    }
});

// 打刻追加 페이지
router.get('/add-attendance', requireLogin, (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>打刻追加</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <link rel="stylesheet" href="/styles.css">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/flatpickr/4.6.13/flatpickr.min.css">
            <script src="https://cdnjs.cloudflare.com/ajax/libs/flatpickr/4.6.13/flatpickr.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/flatpickr/4.6.13/l10n/ja.min.js"></script>
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    flatpickr.localize(flatpickr.l10ns.ja);
                    
                    // 日付ピッカー設定
                    flatpickr("#date", {
                        dateFormat: "Y-m-d",
                        locale: "ja",
                        defaultDate: new Date()
                    });
                    
                    // 時間ピッカー設定
                    const timeConfig = {
                        enableTime: true,
                        noCalendar: true,
                        dateFormat: "H:i",
                        time_24hr: true,
                        locale: "ja"
                    };
                    
                    flatpickr("#checkIn", timeConfig);
                    flatpickr("#lunchStart", timeConfig);
                    flatpickr("#lunchEnd", timeConfig);
                    flatpickr("#checkOut", timeConfig);

                    // クライアントサイドバリデーション
                    document.querySelector('form').addEventListener('submit', function(e) {
                        const date = document.getElementById('date').value;
                        const checkIn = document.getElementById('checkIn').value;
                        const checkOut = document.getElementById('checkOut').value;
                        const lunchStart = document.getElementById('lunchStart').value;
                        const lunchEnd = document.getElementById('lunchEnd').value;
                        
                        // 必須チェック
                        if (!date || !checkIn) {
                            e.preventDefault();
                            alert('日付と出勤時間は必須入力です');
                            return false;
                        }
                        
                        // 退勤時間がある場合は出勤時間より後か確認
                        if (checkOut && checkOut <= checkIn) {
                            e.preventDefault();
                            alert('退勤時間は出勤時間より後にしてください');
                            return false;
                        }
                        
                        // 昼休み時間の整合性チェック
                        if ((lunchStart && !lunchEnd) || (!lunchStart && lunchEnd)) {
                            e.preventDefault();
                            alert('昼休み開始と終了の両方を入力してください');
                            return false;
                        }
                        
                        if (lunchStart && lunchEnd && lunchEnd <= lunchStart) {
                            e.preventDefault();
                            alert('昼休み終了時間は開始時間より後にしてください');
                            return false;
                        }
                        
                        return true;
                    });
                });
            </script>
        </head>
        <body>
            <div class="container">
                <h2>打刻追加</h2>
                <form action="/save-attendance" method="POST">
                    <div class="form-group">
                        <label for="date">日付:</label>
                        <input type="date" id="date" name="date" required>
                    </div>
                    <div class="form-group">
                        <label for="checkIn">出勤時間:</label>
                        <input type="text" id="checkIn" name="checkIn" placeholder="HH:MM" required>
                    </div>
                    <div class="form-group">
                        <label for="lunchStart">昼休み開始時間:</label>
                        <input type="text" id="lunchStart" name="lunchStart" placeholder="HH:MM">
                    </div>
                    <div class="form-group">
                        <label for="lunchEnd">昼休み終了時間:</label>
                        <input type="text" id="lunchEnd" name="lunchEnd" placeholder="HH:MM">
                    </div>
                    <div class="form-group">
                        <label for="checkOut">退勤時間:</label>
                        <input type="text" id="checkOut" name="checkOut" placeholder="HH:MM">
                    </div>
                    <div class="form-group">
                        <label for="status">状態:</label>
                        <select id="status" name="status">
                            <option value="正常">正常</option>
                            <option value="遅刻">遅刻</option>
                            <option value="早退">早退</option>
                            <option value="欠勤">欠勤</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="notes">備考:</label>
                        <textarea id="notes" name="notes" rows="3"></textarea>
                    </div>                    
                    <button type="submit" class="btn">保存</button>
                    <a href="/dashboard" class="btn cancel-btn">キャンセル</a>
                </form>
            </div>
        </body>
        </html>
    `);
});

// 勤怠記録削除
router.post('/delete-attendance/:id', requireLogin, async (req, res) => {
    try {
        const attendance = await Attendance.findById(req.params.id);
        // 承認済みは削除不可
        if (!attendance || attendance.isConfirmed) {
            return res.status(403).send('この勤怠記録は削除できません');
        }
        await Attendance.deleteOne({ _id: req.params.id });
        res.redirect('/my-monthly-attendance?year=' + attendance.date.getFullYear() + '&month=' + (attendance.date.getMonth() + 1));
    } catch (error) {
        console.error('勤怠削除エラー:', error);
        res.status(500).send('削除中にエラーが発生しました');
    }
});

// ========== 勤怠一括登録 ==========
// 一括登録ページ（GET）
router.get('/attendance/bulk-register', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const employee = await Employee.findOne({ userId: user._id });
        if (!employee) return res.status(400).send('社員情報がありません');

        const now = moment().tz('Asia/Tokyo');
        const year  = parseInt(req.query.year)  || now.year();
        const month = parseInt(req.query.month) || now.month() + 1;

        // 対象月の日数
        const daysInMonth = moment.tz(`${year}-${String(month).padStart(2,'0')}-01`, 'Asia/Tokyo').daysInMonth();

        // 既存の勤怠データを取得
        const startDate = moment.tz(`${year}-${month}-01`, 'Asia/Tokyo').startOf('month').toDate();
        const endDate   = moment.tz(`${year}-${month}-01`, 'Asia/Tokyo').endOf('month').toDate();
        const existingAttendances = await Attendance.find({
            userId: user._id,
            date: { $gte: startDate, $lte: endDate }
        });

        // 既存データをdateキーのMapに変換
        const existingMap = {};
        existingAttendances.forEach(a => {
            const key = moment(a.date).tz('Asia/Tokyo').format('YYYY-MM-DD');
            existingMap[key] = a;
        });

        // 承認リクエスト中チェック
        const approvalRequest = await ApprovalRequest.findOne({
            userId: user._id,
            year,
            month,
            status: 'pending'
        });

        if (approvalRequest) {
            return res.send(`
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>勤怠一括登録</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body style="font-family:Inter,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f4f7fb">
<div style="text-align:center;padding:40px;background:#fff;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,0.08)">
    <div style="font-size:48px;margin-bottom:16px">⏳</div>
    <h3 style="color:#0b1220">承認リクエスト中のため編集できません</h3>
    <p style="color:#6b7280">${year}年${month}月は承認リクエスト中です。管理者の処理をお待ちください。</p>
    <a href="/attendance-main" style="display:inline-block;margin-top:16px;padding:10px 24px;background:#0b5fff;color:#fff;border-radius:9px;text-decoration:none;font-weight:600">勤怠管理に戻る</a>
</div>
</body></html>
            `);
        }

        // 日別行データ生成
        const rows = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const dm = moment.tz(dateStr, 'Asia/Tokyo');
            const weekday = dm.day();
            const isWeekend = weekday === 0 || weekday === 6;
            const weekdayLabel = ['日','月','火','水','木','金','土'][weekday];
            const existing = existingMap[dateStr];

            rows.push({
                dateStr,
                day: d,
                weekdayLabel,
                isWeekend,
                isConfirmed: existing ? existing.isConfirmed : false,
                existingId: existing ? existing._id.toString() : '',
                checkIn:    existing && existing.checkIn    ? moment(existing.checkIn).tz('Asia/Tokyo').format('HH:mm')    : '',
                checkOut:   existing && existing.checkOut   ? moment(existing.checkOut).tz('Asia/Tokyo').format('HH:mm')   : '',
                lunchStart: existing && existing.lunchStart ? moment(existing.lunchStart).tz('Asia/Tokyo').format('HH:mm') : '',
                lunchEnd:   existing && existing.lunchEnd   ? moment(existing.lunchEnd).tz('Asia/Tokyo').format('HH:mm')   : '',
                status: existing ? existing.status : (isWeekend ? '欠勤' : '正常'),
                notes:  existing ? (existing.notes || '') : ''
            });
        }

        const yearOptions = [now.year()-1, now.year(), now.year()+1]
            .map(y => `<option value="${y}" ${y === year ? 'selected' : ''}>${y}年</option>`).join('');
        const monthOptions = Array.from({length:12}, (_,i) => i+1)
            .map(m => `<option value="${m}" ${m === month ? 'selected' : ''}>${m}月</option>`).join('');

        res.send(`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>勤怠一括登録 - ${year}年${month}月</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
<style>
:root{--bg:#f4f7fb;--card:#fff;--accent:#0b5fff;--muted:#6b7280;--success:#16a34a;--danger:#ef4444}
*{box-sizing:border-box}
body{margin:0;font-family:Inter,system-ui,sans-serif;background:var(--bg);color:#0f172a;font-size:14px}
.header{display:flex;align-items:center;justify-content:space-between;padding:14px 24px;background:var(--card);box-shadow:0 4px 12px rgba(12,20,40,0.06);position:sticky;top:0;z-index:20}
.brand{font-weight:700;font-size:18px;color:var(--accent)}
.container{max-width:1200px;margin:24px auto;padding:0 16px}
.panel{background:var(--card);border-radius:12px;padding:20px;box-shadow:0 8px 24px rgba(12,20,40,0.05);margin-bottom:16px}
.month-selector{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.month-selector select{padding:8px 12px;border-radius:8px;border:1px solid #dbe7ff;font-size:14px}
.btn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:9px;border:none;cursor:pointer;font-weight:600;font-size:14px;text-decoration:none;transition:opacity .15s}
.btn:hover{opacity:.85}
.btn-primary{background:linear-gradient(90deg,#0b5fff,#184df2);color:#fff}
.btn-ghost{background:transparent;border:1px solid #e6eefb;color:var(--accent)}
.btn-success{background:var(--success);color:#fff}
.btn-sm{padding:6px 10px;font-size:13px}
.bulk-table{width:100%;border-collapse:collapse}
.bulk-table thead th{background:#0b1220;color:#fff;padding:10px 8px;text-align:center;font-size:13px;white-space:nowrap}
.bulk-table tbody td{padding:6px 8px;border-bottom:1px solid rgba(12,20,40,0.05);text-align:center;vertical-align:middle}
.bulk-table tbody tr:hover td{background:#f6fbff}
.bulk-table tbody tr.weekend td{background:#fafafa}
.bulk-table tbody tr.confirmed td{opacity:.75}
.time-input{width:78px;padding:5px 7px;border-radius:6px;border:1px solid #dbe7ff;text-align:center;font-size:13px}
.time-input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 2px rgba(11,95,255,.1)}
.time-input:disabled{background:#f1f5f9;color:#94a3b8;cursor:not-allowed}
.notes-input{width:140px;padding:5px 8px;border-radius:6px;border:1px solid #dbe7ff;font-size:12px}
.notes-input:disabled{background:#f1f5f9;color:#94a3b8;cursor:not-allowed}
.status-select{padding:5px 6px;border-radius:6px;border:1px solid #dbe7ff;font-size:12px;min-width:68px}
.status-select:disabled{background:#f1f5f9;color:#94a3b8;cursor:not-allowed}
.day-label{font-weight:700}
.sun{color:#ef4444}
.sat{color:#3b82f6}
.confirmed-badge{font-size:11px;padding:3px 7px;background:#dcfce7;color:#166534;border-radius:4px;white-space:nowrap}
.table-wrap{overflow:auto;border-radius:8px;max-height:520px}
.summary-bar{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.summary-item{background:#f8fafc;padding:8px 14px;border-radius:8px;font-size:13px}
.summary-item strong{color:#0b1220}
.sticky-footer{position:sticky;bottom:0;background:var(--card);padding:12px 20px;box-shadow:0 -4px 12px rgba(12,20,40,.08);display:flex;gap:10px;justify-content:flex-end;z-index:10}
.tmpl-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:12px;background:#f8fafc;border-radius:8px;margin-bottom:14px;border:1px solid #e6eefb}
.tmpl-row label{font-size:12px;color:var(--muted)}
.tmpl-row input{width:76px;padding:5px 7px;border-radius:6px;border:1px solid #dbe7ff;font-size:13px;text-align:center}
</style>
</head>
<body>
<header class="header">
    <div class="brand"><i class="fa-solid fa-calendar-check"></i> 勤怠一括登録</div>
    <a href="/attendance-main" class="btn btn-ghost btn-sm"><i class="fa-solid fa-arrow-left"></i> 戻る</a>
</header>

<div class="container">
<div class="panel">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:18px">
        <div>
            <h3 style="margin:0 0 4px">${escapeHtml(employee.name)} さん ／ ${year}年${month}月</h3>
            <div style="color:var(--muted);font-size:13px">対象月の勤怠をまとめて入力・更新できます。確定済みの行は編集できません。</div>
        </div>
        <form method="get" action="/attendance/bulk-register" class="month-selector">
            <select name="year">${yearOptions}</select>
            <select name="month">${monthOptions}</select>
            <button type="submit" class="btn btn-primary btn-sm"><i class="fa-solid fa-rotate"></i> 切替</button>
        </form>
    </div>

    <!-- 平日一括入力テンプレート -->
    <div class="tmpl-row">
        <span style="font-weight:600;font-size:13px"><i class="fa-solid fa-magic" style="color:var(--accent)"></i> 平日一括入力</span>
        <label>出勤 <input type="text" id="tmpl-ci" value="09:00"></label>
        <label>退勤 <input type="text" id="tmpl-co" value="18:00"></label>
        <label>昼開始 <input type="text" id="tmpl-ls" value="12:00"></label>
        <label>昼終了 <input type="text" id="tmpl-le" value="13:00"></label>
        <button type="button" class="btn btn-ghost btn-sm" onclick="applyTemplate()"><i class="fa-solid fa-fill-drip"></i> 平日に適用</button>
        <button type="button" class="btn btn-ghost btn-sm" onclick="clearAll()"><i class="fa-solid fa-eraser"></i> 全クリア</button>
    </div>

    <!-- サマリー -->
    <div class="summary-bar">
        <div class="summary-item">出勤日: <strong id="cnt-work">0</strong></div>
        <div class="summary-item" style="color:#f59e0b">遅刻: <strong id="cnt-late">0</strong></div>
        <div class="summary-item" style="color:#f97316">早退: <strong id="cnt-early">0</strong></div>
        <div class="summary-item" style="color:var(--danger)">欠勤: <strong id="cnt-absent">0</strong></div>
    </div>

    <form method="post" action="/attendance/bulk-register" id="bulk-form">
        <input type="hidden" name="year" value="${year}">
        <input type="hidden" name="month" value="${month}">

        <div class="table-wrap">
        <table class="bulk-table">
            <thead>
                <tr>
                    <th style="width:38px">日</th>
                    <th style="width:28px">曜</th>
                    <th style="width:84px">出勤</th>
                    <th style="width:84px">退勤</th>
                    <th style="width:84px">昼開始</th>
                    <th style="width:84px">昼終了</th>
                    <th style="width:90px">状態</th>
                    <th>備考</th>
                    <th style="width:68px">状況</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map((row, idx) => `
                <tr class="${row.isWeekend ? 'weekend' : ''}${row.isConfirmed ? ' confirmed' : ''}"
                    data-date="${row.dateStr}" data-weekend="${row.isWeekend ? '1' : '0'}">
                    <td><span class="day-label ${row.weekdayLabel==='日'?'sun':row.weekdayLabel==='土'?'sat':''}">${row.day}</span></td>
                    <td><span class="${row.weekdayLabel==='日'?'sun':row.weekdayLabel==='土'?'sat':''}">${row.weekdayLabel}</span></td>
                    <td><input type="text" class="time-input ci-input" name="rows[${idx}][checkIn]"
                        value="${escapeHtml(row.checkIn)}" placeholder="09:00" ${row.isConfirmed?'disabled':''}></td>
                    <td><input type="text" class="time-input co-input" name="rows[${idx}][checkOut]"
                        value="${escapeHtml(row.checkOut)}" placeholder="18:00" ${row.isConfirmed?'disabled':''}></td>
                    <td><input type="text" class="time-input ls-input" name="rows[${idx}][lunchStart]"
                        value="${escapeHtml(row.lunchStart)}" placeholder="12:00" ${row.isConfirmed?'disabled':''}></td>
                    <td><input type="text" class="time-input le-input" name="rows[${idx}][lunchEnd]"
                        value="${escapeHtml(row.lunchEnd)}" placeholder="13:00" ${row.isConfirmed?'disabled':''}></td>
                    <td>
                        <select class="status-select st-select" name="rows[${idx}][status]" ${row.isConfirmed?'disabled':''}>
                            <option value="正常"  ${row.status==='正常' ?'selected':''}>正常</option>
                            <option value="遅刻"  ${row.status==='遅刻' ?'selected':''}>遅刻</option>
                            <option value="早退"  ${row.status==='早退' ?'selected':''}>早退</option>
                            <option value="欠勤"  ${row.status==='欠勤' ?'selected':''}>欠勤</option>
                        </select>
                    </td>
                    <td><input type="text" class="notes-input" name="rows[${idx}][notes]"
                        value="${escapeHtml(row.notes)}" placeholder="備考" ${row.isConfirmed?'disabled':''}></td>
                    <td>
                        <input type="hidden" name="rows[${idx}][date]"       value="${row.dateStr}">
                        <input type="hidden" name="rows[${idx}][existingId]" value="${row.existingId}">
                        ${row.isConfirmed
                            ? '<span class="confirmed-badge">確定済</span>'
                            : '<span style="color:#94a3b8;font-size:12px">未確定</span>'}
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>
        </div>

        <div class="sticky-footer">
            <a href="/attendance-main" class="btn btn-ghost"><i class="fa-solid fa-times"></i> キャンセル</a>
            <button type="submit" class="btn btn-success"><i class="fa-solid fa-save"></i> 一括保存</button>
        </div>
    </form>
</div>
</div>

<script>
function updateSummary() {
    let work = 0, absent = 0, late = 0, early = 0;
    document.querySelectorAll('#bulk-form tbody tr').forEach(tr => {
        const ci = tr.querySelector('.ci-input');
        const st = tr.querySelector('.st-select');
        if (!ci || !st || ci.disabled) return;
        if (ci.value.trim()) {
            const s = st.value;
            if (s === '欠勤') absent++;
            else if (s === '遅刻') { work++; late++; }
            else if (s === '早退') { work++; early++; }
            else work++;
        }
    });
    document.getElementById('cnt-work').textContent   = work;
    document.getElementById('cnt-absent').textContent = absent;
    document.getElementById('cnt-late').textContent   = late;
    document.getElementById('cnt-early').textContent  = early;
}

function applyTemplate() {
    const ci = document.getElementById('tmpl-ci').value.trim();
    const co = document.getElementById('tmpl-co').value.trim();
    const ls = document.getElementById('tmpl-ls').value.trim();
    const le = document.getElementById('tmpl-le').value.trim();
    document.querySelectorAll('#bulk-form tbody tr').forEach(tr => {
        if (tr.dataset.weekend === '1') return;
        const ciEl = tr.querySelector('.ci-input');
        if (!ciEl || ciEl.disabled) return;
        ciEl.value = ci;
        const coEl = tr.querySelector('.co-input'); if (coEl) coEl.value = co;
        const lsEl = tr.querySelector('.ls-input'); if (lsEl) lsEl.value = ls;
        const leEl = tr.querySelector('.le-input'); if (leEl) leEl.value = le;
        const stEl = tr.querySelector('.st-select'); if (stEl) stEl.value = '正常';
    });
    updateSummary();
}

function clearAll() {
    if (!confirm('未確定の入力内容をすべてクリアしますか？')) return;
    document.querySelectorAll('#bulk-form tbody tr').forEach(tr => {
        const ciEl = tr.querySelector('.ci-input');
        if (!ciEl || ciEl.disabled) return;
        ['.ci-input','.co-input','.ls-input','.le-input'].forEach(sel => {
            const el = tr.querySelector(sel); if (el) el.value = '';
        });
        const stEl = tr.querySelector('.st-select');
        if (stEl) stEl.value = tr.dataset.weekend === '1' ? '欠勤' : '正常';
        const notesEl = tr.querySelector('.notes-input'); if (notesEl) notesEl.value = '';
    });
    updateSummary();
}

document.getElementById('bulk-form').addEventListener('submit', function(e) {
    const timeRe = /^([01]?\\d|2[0-3]):[0-5]\\d$/;
    for (const tr of this.querySelectorAll('tbody tr')) {
        const ci = tr.querySelector('.ci-input');
        if (!ci || ci.disabled) continue;
        const co = tr.querySelector('.co-input');
        const ls = tr.querySelector('.ls-input');
        const le = tr.querySelector('.le-input');
        const date = tr.dataset.date;
        if (ci.value && !timeRe.test(ci.value))  { alert(date + ' 出勤時間の形式が正しくありません: ' + ci.value); e.preventDefault(); ci.focus(); return; }
        if (co.value && !timeRe.test(co.value))  { alert(date + ' 退勤時間の形式が正しくありません: ' + co.value); e.preventDefault(); co.focus(); return; }
        if (ls.value && !timeRe.test(ls.value))  { alert(date + ' 昼休み開始の形式が正しくありません: ' + ls.value); e.preventDefault(); ls.focus(); return; }
        if (le.value && !timeRe.test(le.value))  { alert(date + ' 昼休み終了の形式が正しくありません: ' + le.value); e.preventDefault(); le.focus(); return; }
        if (ci.value && co.value && co.value <= ci.value) { alert(date + ' 退勤時間は出勤時間より後にしてください'); e.preventDefault(); co.focus(); return; }
        if ((ls.value && !le.value) || (!ls.value && le.value)) { alert(date + ' 昼休み開始と終了は両方入力してください'); e.preventDefault(); return; }
    }
});

document.querySelectorAll('.ci-input, .st-select').forEach(el => el.addEventListener('change', updateSummary));
updateSummary();
</script>
</body>
</html>`);
    } catch (error) {
        console.error('一括登録ページエラー:', error);
        res.status(500).send('サーバーエラーが発生しました');
    }
});

// 一括登録処理（POST）
router.post('/attendance/bulk-register', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const { year, month, rows } = req.body;

        if (!rows || !Array.isArray(rows)) {
            return res.redirect(`/attendance/bulk-register?year=${year}&month=${month}`);
        }

        // 承認リクエスト中チェック
        const approvalRequest = await ApprovalRequest.findOne({
            userId: user._id,
            year: parseInt(year),
            month: parseInt(month),
            status: 'pending'
        });
        if (approvalRequest) {
            return res.status(403).send('この月は承認リクエスト中のため編集できません');
        }

        let savedCount = 0;
        let skippedCount = 0;

        for (const row of rows) {
            const { date, checkIn, checkOut, lunchStart, lunchEnd, status, notes, existingId } = row;
            if (!date) continue;

            // 確定済みはスキップ
            if (existingId) {
                const existing = await Attendance.findById(existingId);
                if (existing && existing.isConfirmed) { skippedCount++; continue; }
            }

            // 出勤時間が空の場合はスキップ
            if (!checkIn || !checkIn.trim()) {
                skippedCount++;
                continue;
            }

            const parseTimeAsJST = (dateStr, timeStr) => {
                if (!dateStr || !timeStr || !timeStr.trim()) return null;
                return moment.tz(`${dateStr} ${timeStr.trim()}`, 'YYYY-MM-DD HH:mm', 'Asia/Tokyo').toDate();
            };

            const checkInDate    = parseTimeAsJST(date, checkIn);
            const checkOutDate   = parseTimeAsJST(date, checkOut);
            const lunchStartDate = parseTimeAsJST(date, lunchStart);
            const lunchEndDate   = parseTimeAsJST(date, lunchEnd);

            // 勤務時間計算
            let workingHours = null;
            let totalHours   = null;
            if (checkInDate && checkOutDate) {
                const totalMs = checkOutDate - checkInDate;
                const lunchMs = (lunchStartDate && lunchEndDate) ? (lunchEndDate - lunchStartDate) : 0;
                workingHours = parseFloat(((totalMs - lunchMs) / 3600000).toFixed(1));
                totalHours   = parseFloat((totalMs / 3600000).toFixed(1));
            }

            const dateObj = moment.tz(date, 'Asia/Tokyo').startOf('day').toDate();
            const attData = {
                userId: user._id,
                date: dateObj,
                checkIn: checkInDate,
                checkOut: checkOutDate   || null,
                lunchStart: lunchStartDate || null,
                lunchEnd: lunchEndDate   || null,
                workingHours,
                totalHours,
                status: status || '正常',
                notes: notes   || null
            };

            if (existingId) {
                // 既存レコードを更新
                await Attendance.findByIdAndUpdate(existingId, { $set: attData });
            } else {
                // 同日重複チェック → 上書き or 新規作成
                const dayStart = moment.tz(date, 'Asia/Tokyo').startOf('day').toDate();
                const dayEnd   = moment.tz(date, 'Asia/Tokyo').endOf('day').toDate();
                const dup = await Attendance.findOne({ userId: user._id, date: { $gte: dayStart, $lte: dayEnd } });
                if (dup) {
                    await Attendance.findByIdAndUpdate(dup._id, { $set: attData });
                } else {
                    await new Attendance(attData).save();
                }
            }
            savedCount++;
        }

        console.log(`一括登録完了: userId=${user._id} year=${year} month=${month} saved=${savedCount} skipped=${skippedCount}`);
        res.redirect(`/my-monthly-attendance?year=${year}&month=${month}`);
    } catch (error) {
        console.error('一括登録処理エラー:', error);
        res.status(500).send('一括登録中にエラーが発生しました: ' + error.message);
    }
});

router.post('/save-attendance', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const [year, month, day] = req.body.date.split('-').map(Number);

        // KST 기준 자정으로 날짜 고정
        const dateObj = moment.tz(`${year}-${month}-${day}`, 'Asia/Tokyo').toDate();

        // 해당 날짜에 이미 기록이 있는지 확인
        const existingAttendance = await Attendance.findOne({
            userId: user._id,
            date: {
                $gte: moment.tz(`${year}-${month}-${day}`, 'Asia/Tokyo').startOf('day').toDate(),
                $lt: moment.tz(`${year}-${month}-${day}`, 'Asia/Tokyo').endOf('day').toDate()
            }
        });

        const parseTime = (timeStr) => {
            if (!timeStr) return null;
            const [hours, minutes] = timeStr.split(':').map(Number);
            return moment.tz(dateObj, 'Asia/Tokyo').set({hours, minutes, seconds: 0}).toDate();
        };

        if (existingAttendance) {
            return res.send(`
                <div class="container">
                    <h2>エラー</h2>
                    <p>選択した日付には既に勤怠記録が存在します</p>
                    <a href="/edit-attendance/${existingAttendance._id}" class="btn">編集ページへ</a>
                    <a href="/attendance-main" class="btn">ダッシュボードに戻る</a>
                </div>
            `);
        }

        const attendance = new Attendance({
            userId: user._id,
            date: moment.tz(dateObj, 'Asia/Tokyo').startOf('day').toDate(),
            checkIn: parseTime(req.body.checkIn),
            checkOut: parseTime(req.body.checkOut),
            lunchStart: parseTime(req.body.lunchStart),
            lunchEnd: parseTime(req.body.lunchEnd),
            status: req.body.status,
            notes: req.body.notes || null
        });

        // 근무 시간 계산 (일본 시간대 기준)
        if (attendance.checkOut) {
            const totalMs = attendance.checkOut - attendance.checkIn;
            let lunchMs = 0;
            
            if (attendance.lunchStart && attendance.lunchEnd) {
                lunchMs = attendance.lunchEnd - attendance.lunchStart;
            }
            
            const workingMs = totalMs - lunchMs;
            attendance.workingHours = parseFloat((workingMs / (1000 * 60 * 60)).toFixed(1));
            attendance.totalHours = parseFloat((totalMs / (1000 * 60 * 60)).toFixed(1));
        }

        await attendance.save();
        res.redirect('/attendance-main');
    } catch (error) {
        console.error('打刻保存エラー:', error);
        res.status(500).send('打刻保存中にエラーが発生しました');
    }
});

// 出勤処理
router.post('/checkin', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        // 「日本時間の今」をUTCで保存
        const now = new Date();
        const todayJST = moment.tz(now, "Asia/Tokyo").startOf('day').toDate();
        const tomorrowJST = moment.tz(now, "Asia/Tokyo").add(1, 'day').startOf('day').toDate();

        const existingRecord = await Attendance.findOne({
            userId: user._id,
            date: { $gte: todayJST, $lt: tomorrowJST },
            checkOut: { $exists: false }
        });
        if (existingRecord) return res.redirect('/attendance-main');

        const attendance = new Attendance({
            userId: user._id,
            date: todayJST,
            checkIn: now, // 現在時刻（UTC）
            status: now.getHours() >= 9 ? '遅刻' : '正常'
        });

        await attendance.save();
        res.redirect('/attendance-main');
    } catch (error) {
        console.error(error);
        res.status(500).send('出勤処理中にエラーが発生しました');
    }
});

// 昼休み開始処理
router.post('/start-lunch', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);

        const now = new Date();
        const todayJST = moment.tz(now, "Asia/Tokyo").startOf('day').toDate();
        const tomorrowJST = moment.tz(now, "Asia/Tokyo").add(1, 'day').startOf('day').toDate();

        const attendance = await Attendance.findOne({
            userId: user._id,
            date: { $gte: todayJST, $lt: tomorrowJST }
        });

        if (!attendance) return res.redirect('/attendance-main');

        attendance.lunchStart = now;
        await attendance.save();
        res.redirect('/attendance-main');
    } catch (error) {
        console.error(error);
        res.status(500).send('昼休み開始処理中にエラーが発生しました');
    }
});

// 昼休み終了処理
router.post('/end-lunch', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);

        const now = new Date();
        const todayJST = moment.tz(now, "Asia/Tokyo").startOf('day').toDate();
        const tomorrowJST = moment.tz(now, "Asia/Tokyo").add(1, 'day').startOf('day').toDate();

        const attendance = await Attendance.findOne({
            userId: user._id,
            date: { $gte: todayJST, $lt: tomorrowJST }
        });

        if (!attendance || !attendance.lunchStart) return res.redirect('/attendance-main');

        attendance.lunchEnd = now;
        await attendance.save();
        res.redirect('/attendance-main');
    } catch (error) {
        console.error(error);
        res.status(500).send('昼休み終了処理中にエラーが発生しました');
    }
});

// 退勤処理
router.post('/checkout', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);

        const now = new Date();
        const todayJST = moment.tz(now, "Asia/Tokyo").startOf('day').toDate();
        const tomorrowJST = moment.tz(now, "Asia/Tokyo").add(1, 'day').startOf('day').toDate();

        const attendance = await Attendance.findOne({
            userId: user._id,
            date: { $gte: todayJST, $lt: tomorrowJST }
        });

        if (!attendance) return res.redirect('/attendance-main');

        attendance.checkOut = now;

        // 昼休み時間がある場合の計算
        if (attendance.lunchStart && attendance.lunchEnd) {
            const lunchDuration = (attendance.lunchEnd - attendance.lunchStart) / (1000 * 60 * 60);
            const totalDuration = (now - attendance.checkIn) / (1000 * 60 * 60);
            attendance.workingHours = Math.round((totalDuration - lunchDuration) * 10) / 10;
            attendance.totalHours = Math.round(totalDuration * 10) / 10;
        } else {
            const totalDuration = (now - attendance.checkIn) / (1000 * 60 * 60);
            attendance.workingHours = Math.round(totalDuration * 10) / 10;
            attendance.totalHours = attendance.workingHours;
        }

        if (attendance.workingHours < 8) attendance.status = '早退';

        await attendance.save();
        res.redirect('/attendance-main');
    } catch (error) {
        console.error(error);
        res.status(500).send('退勤処理中にエラーが発生しました');
    }
});

// 管理者従業員登録ページ
router.get('/my-monthly-attendance', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const employee = await Employee.findOne({ userId: user._id });
        
        if (!employee) {
            return res.status(400).send('社員情報がありません');
        }

        const year = req.query.year || new Date().getFullYear();
        const month = req.query.month || new Date().getMonth() + 1;
        
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        
        const attendances = await Attendance.find({
            userId: user._id,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: 1 });

        const approvalRequest = await ApprovalRequest.findOne({
            userId: user._id,
            year: year,
            month: month
        });        

        // 入社月と照会月が同じか確認
        const isJoinMonth = employee.joinDate.getFullYear() === year && 
                          (employee.joinDate.getMonth() + 1) === month;

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>私の勤怠記録 - ${year}年${month}月</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <link rel="stylesheet" href="/styles.css">
                <style>
                    .request-status {
                        padding: 10px;
                        border-radius: 4px;
                        margin-bottom: 15px;
                    }
                    .status-pending {
                        background: #fff3cd;
                        color: #856404;
                        border-left: 4px solid #ffc107;
                    }
                    .status-approved {
                        background: #d4edda;
                        color: #155724;
                        border-left: 4px solid #28a745;
                    }
                    .status-returned {
                        background: #f8d7da;
                        color: #721c24;
                        border-left: 4px solid #dc3545;
                    }
                </style>                
                <script>
                    function updateClock() {
                        const now = new Date();
                        document.getElementById('current-time').textContent = 
                            '現在時刻: ' + now.toLocaleTimeString('ja-JP');
                    }
                    setInterval(updateClock, 1000);
                    window.onload = updateClock;
                    
                    function requestApproval(year, month) {
                        const confirmed = ${attendances.some(a => a.isConfirmed)};
                        if (confirmed) {
                            return alert('この月の勤怠は既に承認済みです');
                        }

                        if (confirm('${year}年${month}月の勤怠記録を承認リクエストしますか？')) {
                            fetch('/request-approval', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    year: year,
                                    month: month
                                })
                            })
                            .then(response => response.json())
                            .then(data => {
                                if (data.success) {
                                    alert('承認リクエストが完了しました');
                                    location.reload();
                                } else {
                                    alert('承認リクエスト中にエラーが発生しました: ' + data.message);
                                }
                            })
                            .catch(error => {
                                console.error('エラー:', error);
                                alert('承認リクエスト中にエラーが発生しました');
                            });
                        }
                    }
                    
                    function printAttendance(year, month) {
                        window.open('/print-attendance?year=' + year + '&month=' + month, '_blank');
                    }
                </script>
            </head>
            <body>
                <div class="container">
                    <div id="current-time" class="clock"></div>
                    <h2>${employee.name}さんの${year}年${month}月勤怠記録</h2>
                    <p>社員番号: ${employee.employeeId} | 部署: ${employee.department}</p>

                    ${approvalRequest ? `
                        <div class="request-status status-${approvalRequest.status}">
                            <strong>承認状態:</strong> 
                            ${approvalRequest.status === 'pending' ? '承認待ち' : 
                              approvalRequest.status === 'approved' ? '承認済み' : 
                              approvalRequest.status === 'returned' ? '差し戻し' : ''}
                            ${approvalRequest.processedAt ? `
                                <br><small>処理日: ${approvalRequest.processedAt.toLocaleDateString('ja-JP')}</small>
                            ` : ''}
                            ${approvalRequest.status === 'returned' && approvalRequest.returnReason ? `
                                <br><strong>差し戻し理由:</strong> ${approvalRequest.returnReason}
                            ` : ''}
                        </div>
                    ` : ''}                    

                    <form action="/my-monthly-attendance" method="GET" class="month-selector">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="year">年度:</label>
                                <input type="number" id="year" name="year" value="${year}" min="2000" max="2100" required>
                            </div>
                            <div class="form-group">
                                <label for="month">月:</label>
                                <input type="number" id="month" name="month" value="${month}" min="1" max="12" required>
                            </div>
                            <button type="submit" class="btn">照会</button>
                        </div>
                    </form>
                    
                    ${isJoinMonth ? `
                        <div class="notice">
                            <p>※ 今月は入社月です。入社日: ${employee.joinDate.toLocaleDateString('ja-JP')}</p>
                        </div>
                    ` : ''}               
                    <div class="actions">
                        <button onclick="requestApproval(${year}, ${month})" class="btn">承認リクエスト</button>
                        <button onclick="printAttendance(${year}, ${month})" class="btn print-btn">勤怠表印刷</button>
                    </div>                    
                    <table>
                        <thead>
                            <tr>
                                <th>日付</th>
                                <th>出勤</th>
                                <th>退勤</th>
                                <th>昼休憩</th>
                                <th>勤務時間</th>
                                <th>状態</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${attendances.map(att => `
                                <tr>
                                    <td>${moment(att.date).tz('Asia/Tokyo').format('YYYY/MM/DD')}</td>
                                    <td>${att.checkIn ? moment(att.checkIn).tz('Asia/Tokyo').format('HH:mm:ss') : '-'}</td>
                                    <td>${att.checkOut ? moment(att.checkOut).tz('Asia/Tokyo').format('HH:mm:ss') : '-'}</td>
                                    <td>
                                        ${att.lunchStart ? moment(att.lunchStart).tz('Asia/Tokyo').format('HH:mm:ss') : '-'} ～
                                        ${att.lunchEnd ? moment(att.lunchEnd).tz('Asia/Tokyo').format('HH:mm:ss') : '-'}
                                    </td>
                                    <td>${att.workingHours || '-'}時間</td>
                                    <td>${att.status} ${att.isConfirmed ? '<span class="confirmed-badge">承認済み</span>' : ''}</td>
                                    <td>
                                        <a href="/edit-attendance/${att._id}" class="btn edit-btn" 
                                           ${att.isConfirmed || (approvalRequest && approvalRequest.status === 'pending') ? 'disabled style="opacity:0.5; pointer-events:none;"' : ''}>
                                            編集
                                        </a>
                                        <form action="/delete-attendance/${att._id}" method="POST" style="display:inline;" 
                                            onsubmit="return confirm('この打刻記録を削除しますか？');">
                                            <button type="submit" class="btn delete-btn"
                                                ${att.isConfirmed || (approvalRequest && approvalRequest.status === 'pending') ? 'disabled style="opacity:0.5; pointer-events:none;"' : ''}>
                                                削除
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            `).join('')}
                            ${attendances.length === 0 ? `
                                <tr>
                                    <td colspan="7">該当月の勤怠記録がありません</td>
                                </tr>
                            ` : ''}
                        </tbody>
                    </table>
                    
                    <div class="navigation">
                        <a href="/dashboard" class="btn">ダッシュボードに戻る</a>
                    </div>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send('月別勤怠照会中にエラーが発生しました');
    }
});

// 일반 사용자 승인 요청 처리
router.post('/request-approval', requireLogin, async (req, res) => {
    try {
        const { year, month } = req.body;
        const user = await User.findById(req.session.userId);
        const employee = await Employee.findOne({ userId: user._id });
        
        if (!employee) {
            return res.json({ success: false, message: '社員情報が見つかりません' });
        }

        // 이미 확정된 월인지 확인
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        
        const existingConfirmed = await Attendance.findOne({
            userId: user._id,
            date: { $gte: startDate, $lte: endDate },
            isConfirmed: true
        });
        
        if (existingConfirmed) {
            return res.json({ 
                success: false, 
                message: 'この月の勤怠は既に承認済みです' 
            });
        }

        // 이미 요청이 있는지 확인
        const existingRequest = await ApprovalRequest.findOne({
            userId: user._id,
            year: year,
            month: month,
            status: 'pending'
        });
        
        if (existingRequest) {
            return res.json({ 
                success: false, 
                message: 'この月の承認リクエストは既に送信されています' 
            });
        }

        // 既存のリクエスト（pendingまたはreturned）を削除
        await ApprovalRequest.deleteMany({
            userId: user._id,
            year: year,
            month: month,
            status: { $in: ['pending', 'returned'] }
        });

        // 새 요청 생성
        const request = new ApprovalRequest({
            employeeId: employee.employeeId,
            userId: user._id,
            year: year,
            month: month,
            status: 'pending'
        });
        
        await request.save();
        
        res.json({ 
            success: true, 
            message: '承認リクエストが完了しました',
            employee: employee.name,
            year: year,
            month: month
        });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: '承認リクエスト中にエラーが発生しました' });
    }
});

// 관리자 승인 요청 목록
router.get('/print-attendance', requireLogin, async (req, res) => {
    try {
        const { year, month } = req.query;
        const user = await User.findById(req.session.userId);
        const employee = await Employee.findOne({ userId: user._id });
        
        if (!employee) {
            return res.status(404).send('社員情報が見つかりません');
        }

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        
        const attendances = await Attendance.find({
            userId: user._id,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: 1 });
        
        // 総勤務時間計算
        const totalWorkingHours = attendances.reduce((sum, att) => sum + (att.workingHours || 0), 0);
        
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>勤怠表印刷 - ${employee.name}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <link rel="stylesheet" href="/styles.css">
                <style>
                    @media print {
                        body { padding: 0; background: white; }
                        .no-print { display: none; }
                        .print-container { box-shadow: none; border: none; }
                        table { page-break-inside: auto; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                    }
                    .print-container {
                        max-width: 800px;
                        margin: 20px auto;
                        padding: 30px;
                        background: white;
                        border: 1px solid #ddd;
                    }
                    .print-header {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .print-title {
                        font-size: 24px;
                        font-weight: bold;
                        margin-bottom: 10px;
                    }
                    .employee-info {
                        margin-bottom: 20px;
                        border-bottom: 1px solid #eee;
                        padding-bottom: 20px;
                    }
                    .print-footer {
                        margin-top: 30px;
                        text-align: right;
                        border-top: 1px solid #eee;
                        padding-top: 20px;
                    }
                    .signature-line {
                        display: inline-block;
                        width: 200px;
                        border-top: 0px solid #000;
                        margin-top: 70px;
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <div class="print-container">
                    <div class="print-header">
                        <div class="print-title">月別勤怠状況表</div>
                        <div>${year}年${month}月</div>
                    </div>
                    
                    <div class="employee-info">
                        <div><strong>氏名:</strong> ${employee.name}</div>
                        <div><strong>社員番号:</strong> ${employee.employeeId}</div>
                        <div><strong>部署:</strong> ${employee.department}</div>
                        <div><strong>職位:</strong> ${employee.position}</div>
                        <div><strong>入社日:</strong> ${employee.joinDate.toLocaleDateString('ja-JP')}</div>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>日付</th>
                                <th>出勤時間</th>
                                <th>退勤時間</th>
                                <th>昼休憩</th>
                                <th>勤務時間</th>
                                <th>状態</th>
                                <th>備考</th> 
                            </tr>
                        </thead>
                        <tbody>
                            ${attendances.map(att => `
                                <tr>
                                    <td>${moment(att.date).tz('Asia/Tokyo').format('YYYY/MM/DD')}</td>
                                    <td>${att.checkIn ? moment(att.checkIn).tz('Asia/Tokyo').format('HH:mm:ss') : '-'}</td>
                                    <td>${att.checkOut ? moment(att.checkOut).tz('Asia/Tokyo').format('HH:mm:ss') : '-'}</td>
                                    <td>
                                        ${att.lunchStart ? moment(att.lunchStart).tz('Asia/Tokyo').format('HH:mm:ss') : '-'} ～
                                        ${att.lunchEnd ? moment(att.lunchEnd).tz('Asia/Tokyo').format('HH:mm:ss') : '-'}
                                    </td>
                                    <td>${att.workingHours || '-'}時間</td>
                                    <td>${att.status}</td>
                                    <td class="note-cell">${att.notes || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <div class="total-hours">
                        <strong>月間総勤務時間:</strong> ${totalWorkingHours.toFixed(1)}時間
                    </div>
                    
                    <div class="print-footer">
                        <div>作成日: ${new Date().toLocaleDateString('ja-JP')}</div>
                        <div class="signature-line">署名</div>
                    </div>
                    
                    <div class="no-print" style="margin-top: 30px; text-align: center;">
                        <button onclick="window.print()" class="btn">印刷</button>
                        <button onclick="window.close()" class="btn">閉じる</button>
                    </div>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send('勤怠表印刷中にエラーが発生しました');
    }
});

module.exports = router;
