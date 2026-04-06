// ==============================
// routes/leave.js - 休暇申請
// ==============================
const router = require('express').Router();
const moment = require('moment-timezone');
const { User, Employee, LeaveRequest } = require('../models');
const { requireLogin, isAdmin } = require('../middleware/auth');
const { sendMail } = require('../config/mailer');

router.get('/leave/apply', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const employee = await Employee.findOne({ userId: user._id });
        
        if (!employee) {
            return res.status(400).send('社員情報がありません');
        }

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>休暇申請</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <link rel="stylesheet" href="/styles.css">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/flatpickr/4.6.13/flatpickr.min.css">
                <script src="https://cdnjs.cloudflare.com/ajax/libs/flatpickr/4.6.13/flatpickr.min.js"></script>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/flatpickr/4.6.13/l10n/ja.min.js"></script>
                <script>
                    document.addEventListener('DOMContentLoaded', function() {
                        flatpickr.localize(flatpickr.l10ns.ja);
                        
                        flatpickr("#startDate, #endDate", {
                            dateFormat: "Y-m-d",
                            locale: "ja",
                            minDate: "today"
                        });
                        
                        document.getElementById('endDate').addEventListener('change', calculateDays);
                        
                        function calculateDays() {
                            const startDate = new Date(document.getElementById('startDate').value);
                            const endDate = new Date(document.getElementById('endDate').value);
                            
                            if (startDate && endDate) {
                                const diffTime = Math.abs(endDate - startDate);
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                document.getElementById('days').value = diffDays;
                            }
                        }
                    });
                </script>
            </head>
            <body>
                <div class="container">
                    <h2>休暇申請</h2>
                    
                    <form action="/leave/apply" method="POST">
                        <div class="form-group">
                            <label for="leaveType">休暇種類:</label>
                            <select id="leaveType" name="leaveType" required>
                                <option value="">選択してください。</option>
                                <option value="有給">有給</option>
                                <option value="病欠">病欠</option>
                                <option value="慶弔">慶弔</option>
                                <option value="その他">その他</option>
                            </select>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="startDate">開始日:</label>
                                <input type="text" id="startDate" name="startDate" required>
                            </div>
                            <div class="form-group">
                                <label for="endDate">終了日:</label>
                                <input type="text" id="endDate" name="endDate" required>
                            </div>
                            <div class="form-group">
                                <label for="days">日数:</label>
                                <input type="number" id="days" name="days" readonly>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="reason">理由:</label>
                            <textarea id="reason" name="reason" rows="4" required></textarea>
                        </div>
                        
                        <button type="submit" class="btn">申請</button>
                        <a href="/dashboard" class="btn cancel-btn">キャンセル</a>
                    </form>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send('休暇申請ページローディング中にエラーが発生しました。');
    }
});

router.post('/leave/apply', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const employee = await Employee.findOne({ userId: user._id });
        
        if (!employee) {
            return res.status(400).send('社員情報がありません');
        }

        const { leaveType, startDate, endDate, days, reason } = req.body;
        
        const leaveRequest = new LeaveRequest({
            userId: user._id,
            employeeId: employee.employeeId,
            name: employee.name,
            department: employee.department,
            leaveType,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            days: parseInt(days),
            reason,
            status: 'pending'
        });
        
        await leaveRequest.save();
        res.redirect('/leave/my-requests');
    } catch (error) {
        console.error(error);
        res.status(500).send('休暇申請エラーが発生しました。');
    }
});

router.get('/leave/my-requests', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const requests = await LeaveRequest.find({ userId: user._id })
            .sort({ createdAt: -1 });
            
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>休暇申請履歴</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <link rel="stylesheet" href="/styles.css">
            </head>
            <body>
                <div class="container">
                    <h2>休暇申請履歴</h2>
                    <a href="/leave/apply" class="btn">休暇申請</a>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>休暇種類</th>
                                <th>期間</th>
                                <th>日数</th>
                                <th>状況</th>
                                <th>申請日</th>
                                <th>承認日</th>
                                <th>備考</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${requests.map(req => `
                                <tr>
                                    <td>${req.leaveType}</td>
                                    <td>
                                        ${req.startDate.toLocaleDateString('ja-JP')} ~
                                        ${req.endDate.toLocaleDateString('ja-JP')}
                                    </td>
                                    <td>${req.days}日</td>
                                    <td class="status-${req.status}">
                                        ${req.status === 'pending' ? '待機中' : 
                                          req.status === 'approved' ? '承認済' : 
                                          req.status === 'rejected' ? '拒否' : 'キャンセル'}
                                    </td>
                                    <td>${req.createdAt.toLocaleDateString('ja-JP')}</td>
                                    <td>${req.processedAt ? req.processedAt.toLocaleDateString('ja-JP') : '-'}</td>
                                    <td>${req.notes || '-'}</td>
                                </tr>
                            `).join('')}
                            ${requests.length === 0 ? `
                                <tr>
                                    <td colspan="7">申請履歴がありません。</td>
                                </tr>
                            ` : ''}
                        </tbody>
                    </table>
                    
                    <a href="/dashboard" class="btn">ホームに戻る</a>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send('休暇申請履歴照会中エラーが発生しました。');
    }
});

router.get('/admin/leave-requests', requireLogin, isAdmin, async (req, res) => {
    try {
        const requests = await LeaveRequest.find({ status: 'pending' })
            .sort({ createdAt: 1 })
            .populate('userId', 'username');
            
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>休暇承認リクエスト</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <link rel="stylesheet" href="/styles.css">
                <style>
                    .request-card {
                        background: white;
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 15px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .request-header {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 10px;
                    }
                    .request-actions {
                        margin-top: 10px;
                        display: flex;
                        gap: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>休暇承認リクエスト</h2>
                    
                    ${requests.map(req => `
                        <div class="request-card">
                            <div class="request-header">
                                <h3>${req.name} (${req.employeeId}) - ${req.department}</h3>
                                <span>${req.createdAt.toLocaleDateString('ja-JP')}</span>
                            </div>
                            <p><strong>休暇種類:</strong> ${req.leaveType}</p>
                            <p><strong>期間:</strong> ${req.startDate.toLocaleDateString('ja-JP')} ~ ${req.endDate.toLocaleDateString('ja-JP')} (${req.days}日)</p>
                            <p><strong>理由:</strong> ${req.reason}</p>
                            
                            <div class="request-actions">
                                <form action="/admin/approve-leave/${req._id}" method="POST" style="display:inline;">
                                    <button type="submit" class="btn">承認</button>
                                </form>
                                <form action="/admin/reject-leave/${req._id}" method="POST" style="display:inline;">
                                    <button type="submit" class="btn reject-btn">拒否</button>
                                </form>
                            </div>
                        </div>
                    `).join('')}
                    
                    ${requests.length === 0 ? `
                        <div class="notice">
                            <p>リクエストが存在しません。</p>
                        </div>
                    ` : ''}
                    
                    <a href="/dashboard" class="btn">ホームに戻る</a>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send('休暇承認中エラーが発生しました。');
    }
});

// 管理者ダッシュボード (インデックス)
router.post('/admin/approve-leave/:id', requireLogin, isAdmin, async (req, res) => {
    try {
        const request = await LeaveRequest.findById(req.params.id);
        if (!request) {
            return res.redirect('/admin/leave-requests');
        }
        
        request.status = 'approved';
        request.processedAt = new Date();
        request.processedBy = req.session.userId;
        await request.save();
        
        res.redirect('/admin/leave-requests');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/leave-requests');
    }
});

// 휴가 거절 처리
router.post('/admin/reject-leave/:id', requireLogin, isAdmin, async (req, res) => {
    try {
        const request = await LeaveRequest.findById(req.params.id);
        if (!request) {
            return res.redirect('/admin/leave-requests');
        }
        
        request.status = 'rejected';
        request.processedAt = new Date();
        request.processedBy = req.session.userId;
        await request.save();
        
        res.redirect('/admin/leave-requests');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/leave-requests');
    }
});

// 패스워드 변경 처리 라우트 (POST)

module.exports = router;