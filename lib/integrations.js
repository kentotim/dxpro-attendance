// ==============================
// lib/integrations.js - 外部API連携ハブ
// ==============================
'use strict';
const crypto = require('crypto');
const https  = require('https');
const http   = require('http');
const { IntegrationConfig } = require('../models');

// ─────────────────────────────────────────────────────────────
// 暗号化ユーティリティ（AES-256-CBC）
// ─────────────────────────────────────────────────────────────
const ENCRYPT_KEY = (process.env.INTEGRATION_SECRET || 'dxpro-integration-secret-key-32b!').slice(0, 32);

function encrypt(text) {
    if (!text) return '';
    const iv  = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPT_KEY), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
    if (!text || !text.includes(':')) return text || '';
    try {
        const [ivHex, encrypted] = text.split(':');
        const iv     = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPT_KEY), iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        return '';
    }
}

// ─────────────────────────────────────────────────────────────
// 設定取得（復号済み）
// ─────────────────────────────────────────────────────────────
async function getConfig(service) {
    const cfg = await IntegrationConfig.findOne({ service }).lean();
    if (!cfg) return null;
    // 暗号化フィールドを復号
    const fields = ['webhookUrl', 'apiKey', 'clientId', 'accessToken', 'refreshToken', 'botId', 'channelId', 'companyId'];
    for (const f of fields) {
        if (cfg[f]) cfg[f] = decrypt(cfg[f]);
    }
    return cfg;
}

// 設定保存（暗号化）
async function saveConfig(service, data) {
    const fields = ['webhookUrl', 'apiKey', 'clientId', 'accessToken', 'refreshToken', 'botId', 'channelId', 'companyId'];
    const encrypted = { ...data };
    for (const f of fields) {
        if (encrypted[f] !== undefined && encrypted[f] !== '') {
            encrypted[f] = encrypt(encrypted[f]);
        }
    }
    encrypted.updatedAt = new Date();
    await IntegrationConfig.findOneAndUpdate(
        { service },
        { $set: encrypted },
        { upsert: true, new: true }
    );
}

// ─────────────────────────────────────────────────────────────
// HTTPリクエストユーティリティ
// ─────────────────────────────────────────────────────────────
function httpPost(urlStr, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const url     = new URL(urlStr);
        const payload = JSON.stringify(body);
        const mod     = url.protocol === 'https:' ? https : http;
        const req = mod.request({
            hostname: url.hostname,
            port:     url.port || (url.protocol === 'https:' ? 443 : 80),
            path:     url.pathname + url.search,
            method:   'POST',
            headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...headers }
        }, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// ─────────────────────────────────────────────────────────────
// Slack通知送信
// ─────────────────────────────────────────────────────────────
async function sendSlack(message, options = {}) {
    const cfg = await getConfig('slack');
    if (!cfg || !cfg.enabled || !cfg.webhookUrl) return { ok: false, reason: 'disabled' };
    try {
        const payload = {
            text: message,
            username: 'DXPRO 勤怠システム',
            icon_emoji: ':office:',
            ...(cfg.channel ? { channel: cfg.channel } : {}),
            ...options
        };
        const res = await httpPost(cfg.webhookUrl, payload);
        return { ok: res.status === 200, status: res.status };
    } catch (e) {
        console.error('[Slack]', e.message);
        return { ok: false, error: e.message };
    }
}

// Slackリッチメッセージ（Block Kit）
async function sendSlackBlocks(text, blocks) {
    const cfg = await getConfig('slack');
    if (!cfg || !cfg.enabled || !cfg.webhookUrl) return { ok: false, reason: 'disabled' };
    try {
        const res = await httpPost(cfg.webhookUrl, {
            text,
            blocks,
            username: 'DXPRO 勤怠システム',
            icon_emoji: ':office:',
            ...(cfg.channel ? { channel: cfg.channel } : {})
        });
        return { ok: res.status === 200 };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

// ─────────────────────────────────────────────────────────────
// LINE WORKS通知送信
// ─────────────────────────────────────────────────────────────
async function sendLineWorks(message) {
    const cfg = await getConfig('line_works');
    if (!cfg || !cfg.enabled || !cfg.webhookUrl) return { ok: false, reason: 'disabled' };
    try {
        // LINE WORKS Bot Webhook（Incoming Webhook形式）
        const res = await httpPost(cfg.webhookUrl, { content: { type: 'text', text: message } });
        return { ok: res.status < 300, status: res.status };
    } catch (e) {
        console.error('[LINE WORKS]', e.message);
        return { ok: false, error: e.message };
    }
}

// ─────────────────────────────────────────────────────────────
// イベント別通知ルーター（Slack + LINE WORKS 同時送信）
// ─────────────────────────────────────────────────────────────
async function notifyEvent(eventType, message, blocks = null) {
    const results = {};

    // Slackイベント設定確認
    const slackCfg = await getConfig('slack');
    if (slackCfg && slackCfg.enabled && slackCfg.notifyEvents && slackCfg.notifyEvents[eventType]) {
        if (blocks) {
            results.slack = await sendSlackBlocks(message, blocks);
        } else {
            results.slack = await sendSlack(message);
        }
    }

    // LINE WORKSイベント設定確認
    const lwCfg = await getConfig('line_works');
    if (lwCfg && lwCfg.enabled && lwCfg.notifyEvents && lwCfg.notifyEvents[eventType]) {
        results.lineWorks = await sendLineWorks(message);
    }

    return results;
}

// ─────────────────────────────────────────────────────────────
// freee給与エクスポート（CSV生成）
// ─────────────────────────────────────────────────────────────
async function exportFreeePayroll(payrollData) {
    // freee給与CSVフォーマット（簡易版）
    const headers = ['従業員番号', '氏名', '基本給', '残業代', '交通費', '総支給額', '控除合計', '差引支給額'];
    const rows = payrollData.map(p => [
        p.employeeNo || '',
        p.name || '',
        p.baseSalary || 0,
        p.overtimePay || 0,
        p.transportation || 0,
        p.totalPay || 0,
        p.totalDeduction || 0,
        p.netPay || 0
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    return '\uFEFF' + csv; // BOM付きUTF-8
}

// ─────────────────────────────────────────────────────────────
// マネーフォワード勤怠CSVエクスポート
// ─────────────────────────────────────────────────────────────
async function exportMoneyForwardAttendance(attendanceData) {
    const headers = ['日付', '従業員番号', '氏名', '出勤時刻', '退勤時刻', '実労働時間', '残業時間', '備考'];
    const rows = attendanceData.map(a => [
        a.date || '',
        a.employeeNo || '',
        a.name || '',
        a.checkIn || '',
        a.checkOut || '',
        a.workHours || 0,
        a.overtimeHours || 0,
        a.notes || ''
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    return '\uFEFF' + csv;
}

module.exports = {
    encrypt, decrypt,
    getConfig, saveConfig,
    sendSlack, sendSlackBlocks, sendLineWorks,
    notifyEvent,
    exportFreeePayroll, exportMoneyForwardAttendance
};
