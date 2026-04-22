// ==============================
// routes/lang.js - 言語設定API
// ==============================
'use strict';
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const SUPPORTED = ['ja', 'en', 'vi'];

// セッションに言語を保存するAPI
router.post('/api/lang', (req, res) => {
    const { lang } = req.body;
    if (!SUPPORTED.includes(lang)) return res.status(400).json({ error: 'Unsupported language' });
    req.session.lang = lang;
    res.json({ ok: true, lang });
});

// 現在の言語を返すAPI
router.get('/api/lang', (req, res) => {
    res.json({ lang: req.session.lang || 'ja' });
});

// 言語辞書JSONを返すAPI（クライアントから最新辞書を取得したい場合用）
router.get('/api/lang/:code.json', (req, res) => {
    const code = req.params.code;
    if (!SUPPORTED.includes(code)) return res.status(404).json({ error: 'Not found' });
    const filePath = path.join(__dirname, '../locales', code + '.json');
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
    res.sendFile(filePath);
});

module.exports = router;
