// ==============================
// lib/dailyReportSummary.js - 日報 AI要約
// ==============================
'use strict';
const moment = require('moment-timezone');
const { DailyReport, Employee } = require('../models');
const { sendMail } = require('../config/mailer');

let openaiClient = null;
function getOpenAI() {
    if (!openaiClient) {
        const { default: OpenAI } = require('openai');
        openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openaiClient;
}

// ─────────────────────────────────────────
// 日報テキストをAIで要約
// ─────────────────────────────────────────
async function summarizeReports(reports, period, department) {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
        // APIキー未設定時はルールベースのフォールバック
        return buildFallbackSummary(reports, period, department);
    }

    const texts = reports.map(r => {
        const emp = r._emp || {};
        return `【${emp.name || '不明'} / ${moment(r.reportDate).format('M/D')}】\n${r.content || ''}\n${r.achievements ? '成果: ' + r.achievements : ''}\n${r.issues ? '課題: ' + r.issues : ''}`;
    }).join('\n\n---\n\n');

    const prompt = `あなたは優秀な人事マネージャーです。以下は${department ? department + 'の' : ''}${period}の日報です。管理者向けに以下の形式で日本語で要約してください：

1. 📈 全体的なトレンド（2〜3文）
2. ✅ ポジティブなトピック（箇条書き3〜5件）
3. ⚠️ 注意が必要なトピック・課題（箇条書き3〜5件）
4. 👀 特に注目すべき社員・状況（具体的に）
5. 💡 管理者へのアドバイス（1〜2文）

日報：
${texts.slice(0, 8000)}`; // トークン制限のため8000文字まで

    try {
        const ai = getOpenAI();
        const resp = await ai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 800,
            temperature: 0.5
        });
        return resp.choices[0].message.content;
    } catch (e) {
        console.error('[DailyReportSummary] OpenAI error:', e.message);
        return buildFallbackSummary(reports, period, department);
    }
}

// APIキー未設定時のフォールバック（ルールベース）
function buildFallbackSummary(reports, period, department) {
    const count = reports.length;
    const withIssues = reports.filter(r => r.issues && r.issues.trim()).length;
    const withAchievements = reports.filter(r => r.achievements && r.achievements.trim()).length;

    return `📊 ${period} 日報サマリー（${department || '全部門'}）\n\n` +
        `📈 全体トレンド\n投稿数：${count}件、成果記載：${withAchievements}件、課題記載：${withIssues}件\n\n` +
        `⚠️ 注意事項\nOpenAI APIキーが設定されていないため、AIによる詳細分析は利用できません。\n.envファイルに OPENAI_API_KEY を設定してください。\n\n` +
        `📝 投稿者一覧\n` +
        reports.slice(0, 10).map(r => `• ${(r._emp || {}).name || '不明'} (${moment(r.reportDate).format('M/D')})`).join('\n');
}

// ─────────────────────────────────────────
// 集計 & メール送信のメイン関数
// ─────────────────────────────────────────
async function sendWeeklySummary(targetEmails) {
    await sendSummary('weekly', targetEmails);
}

async function sendMonthlySummary(targetEmails) {
    await sendSummary('monthly', targetEmails);
}

async function sendSummary(type, targetEmails) {
    try {
        const now = moment().tz('Asia/Tokyo');
        let from, to, periodLabel;

        if (type === 'weekly') {
            from = now.clone().subtract(7, 'days').startOf('day').toDate();
            to   = now.clone().endOf('day').toDate();
            periodLabel = `${now.clone().subtract(7, 'days').format('M/D')}〜${now.format('M/D')} 週次`;
        } else {
            from = now.clone().subtract(1, 'month').startOf('month').toDate();
            to   = now.clone().subtract(1, 'month').endOf('month').toDate();
            periodLabel = `${now.clone().subtract(1, 'month').format('YYYY年M月')} 月次`;
        }

        // 全日報を取得
        const reports = await DailyReport.find({
            reportDate: { $gte: from, $lte: to }
        }).lean();

        if (reports.length === 0) {
            console.log('[DailyReportSummary] 対象日報なし', type);
            return;
        }

        // 従業員情報をひも付け
        const employees = await Employee.find().lean();
        const empMap = Object.fromEntries(employees.map(e => [e.userId.toString(), e]));
        for (const r of reports) {
            r._emp = empMap[r.userId?.toString()] || {};
        }

        // 部門別に集計
        const deptMap = {};
        for (const r of reports) {
            const dept = r._emp.department || '未分類';
            if (!deptMap[dept]) deptMap[dept] = [];
            deptMap[dept].push(r);
        }

        // 全体サマリー + 部門別サマリーをAIで生成
        const overallSummary = await summarizeReports(reports, periodLabel, null);
        const deptSummaries = {};
        for (const [dept, reps] of Object.entries(deptMap)) {
            deptSummaries[dept] = await summarizeReports(reps, periodLabel, dept);
        }

        // メールHTML生成
        const deptHtml = Object.entries(deptSummaries).map(([dept, summary]) => `
            <div style="margin-top:24px;border-left:4px solid #0f6fff;padding-left:16px">
                <h3 style="margin:0 0 8px;color:#0f6fff;font-size:15px">${dept}（${deptMap[dept].length}件）</h3>
                <pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;color:#334155;background:#f8fafc;padding:12px;border-radius:8px">${summary}</pre>
            </div>
        `).join('');

        const emailHtml = `
        <div style="font-family:'Hiragino Sans','Meiryo',sans-serif;max-width:700px;margin:0 auto;color:#1e293b">
            <div style="background:linear-gradient(135deg,#0f6fff,#6366f1);padding:24px 28px;border-radius:12px 12px 0 0">
                <h2 style="margin:0;color:#fff;font-size:20px">📋 ${periodLabel} 日報AIサマリー</h2>
                <p style="margin:6px 0 0;color:rgba(255,255,255,.8);font-size:13px">
                    集計期間：${moment(from).format('YYYY/MM/DD')} 〜 ${moment(to).format('YYYY/MM/DD')} ／ 投稿数：${reports.length}件
                </p>
            </div>
            <div style="background:#fff;padding:24px 28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
                <h3 style="margin:0 0 8px;font-size:16px">🏢 全体サマリー</h3>
                <pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;color:#334155;background:#f8fafc;padding:16px;border-radius:8px">${overallSummary}</pre>
                <h3 style="margin:24px 0 12px;font-size:16px">🗂 部門別サマリー</h3>
                ${deptHtml}
                <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">
                    このメールはDXPRO 勤怠管理システムにより自動送信されました。<br>
                    日報一覧：<a href="${process.env.BASE_URL || 'http://localhost:10000'}/hr/daily-report" style="color:#0f6fff">こちら</a>
                </div>
            </div>
        </div>`;

        const emails = Array.isArray(targetEmails) ? targetEmails : [targetEmails];
        for (const to of emails.filter(Boolean)) {
            await sendMail({
                to,
                subject: `【DXPRO】${periodLabel} 日報AIサマリー（${reports.length}件）`,
                html: emailHtml
            });
        }
        console.log(`[DailyReportSummary] ${type} summary sent to`, emails);
    } catch (e) {
        console.error('[DailyReportSummary] sendSummary error:', e.message);
    }
}

module.exports = { sendWeeklySummary, sendMonthlySummary, sendSummary };
