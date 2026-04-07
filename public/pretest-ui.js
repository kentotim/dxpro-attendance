/* pretest-ui.js — テストページ クライアントスクリプト (static file) */
(function(){
    /* ── タイマー ── */
    var startedAt = new Date();
    var LIMIT_SEC = 90 * 60;

    function fmtTime(s){
        return [Math.floor(s/3600), Math.floor((s%3600)/60), s%60]
            .map(function(n){ return String(n).padStart(2,'0'); }).join(':');
    }

    var _tmr = setInterval(function(){
        var elapsed = Math.round((Date.now() - startedAt) / 1000);
        var timerDsp = document.getElementById('pt-timer-display');
        var timerEl  = document.getElementById('pt-timer');
        if(timerDsp) timerDsp.textContent = fmtTime(elapsed);
        if(timerEl && elapsed >= LIMIT_SEC - 300) timerEl.classList.add('warn');
        if(elapsed >= LIMIT_SEC){
            clearInterval(_tmr);
            if(timerDsp) timerDsp.textContent = '⏰ 時間切れ';
            var sb = document.getElementById('pt-submit-btn');
            if(sb) sb.click();
        }
    }, 1000);

    /* ── 進捗バー ── */
    var answered = new Set();

    window.ptMarkAnswered = function(n, el){
        var card = document.getElementById('ptcard-q' + n);
        if(el.value.trim()){
            answered.add(n);
            if(card) card.classList.add('answered');
        } else {
            answered.delete(n);
            if(card) card.classList.remove('answered');
        }
        var pct = Math.round(answered.size / 40 * 100);
        var pb = document.getElementById('pt-pbar');
        var pc = document.getElementById('pt-pcount');
        if(pb) pb.style.width = pct + '%';
        if(pc) pc.textContent = answered.size + ' / 40';
    };

    /* ── セクション切替 ── */
    var sectionMap = {
        info:   'pt-sec-info',
        q1:     'pt-sec-q1',
        q2:     'pt-sec-q2',
        c1:     'pt-sec-c1',
        c2:     'pt-sec-c2',
        submit: 'pt-sec-submit'
    };
    var stepMap = {
        info:   'step-info-btn',
        q1:     'step-q1-btn',
        q2:     'step-q2-btn',
        c1:     'step-c1-btn',
        c2:     'step-c2-btn',
        submit: 'step-submit-btn'
    };

    window.ptShowSection = function(key){
        if(key === 'submit') ptBuildSummary();

        Object.keys(sectionMap).forEach(function(k){
            var el = document.getElementById(sectionMap[k]);
            if(el) el.classList.remove('active');
        });
        Object.keys(stepMap).forEach(function(k){
            var el = document.getElementById(stepMap[k]);
            if(el) el.classList.remove('active');
        });

        var sec = document.getElementById(sectionMap[key]);
        var stp = document.getElementById(stepMap[key]);
        if(sec) sec.classList.add('active');
        if(stp) stp.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    /* ── 送信前サマリー ── */
    function ptBuildSummary(){
        var form = document.getElementById('pt-form');
        if(!form) return;
        var fd   = new FormData(form);
        var name  = fd.get('name')  || '（未入力）';
        var email = fd.get('email') || '（未入力）';
        var blank = [];
        for(var i = 1; i <= 40; i++){
            if(!(fd.get('q' + i) || '').trim()) blank.push('Q' + i);
        }
        var box = document.getElementById('pt-check-summary');
        if(box){
            box.innerHTML =
                '<strong>氏名：</strong>' + name +
                '　<strong>メール：</strong>' + email + '<br>' +
                '<strong>回答済み：</strong>' + answered.size + ' / 40 問<br>' +
                (blank.length > 0
                    ? '<span style="color:#dc2626">⚠️ 未回答：' + blank.join(', ') + '</span>'
                    : '<span style="color:#16a34a">✅ 全問回答済み</span>');
        }
        var prev = document.getElementById('pt-preview-text');
        if(prev) prev.textContent = '回答済み ' + answered.size + ' / 40 問';
    }

    /* ── 採点・送信 ── */
    var interviewKw = {
        q1:  ['gc','ガベージ','メモリ','heap'],
        q2:  ['ガベージ','自動','回収'],
        q3:  ['checked','unchecked','チェック'],
        q4:  ['event loop','イベント'],
        q5:  ['this','コンテキスト','参照'],
        q6:  ['設定','起動','自動設定'],
        q7:  ['DI','依存性注入'],
        q8:  ['REST','HTTP','リソース'],
        q9:  ['GET','POST','HTTP'],
        q10: ['隔離','isolation'],
        q11: ['インデックス','検索','高速'],
        q12: ['XSS','エスケープ','サニタイズ'],
        q13: ['async','非同期'],
        q14: ['UTF-8','エンコード'],
        q15: ['マイクロサービス','分割'],
        q16: ['immutable','不変'],
        q17: ['バージョン','依存'],
        q18: ['テスト','ユニット'],
        q19: ['ログ','出力','context'],
        q20: ['メモリ','リーク','増加']
    };
    var codeKwStr = {
        q21: 'null|Optional',
        q22: 'Set|filter|unique',
        q23: 'RestController|GetMapping|RequestMapping',
        q24: 'prepareStatement|PreparedStatement|SELECT',
        q25: 'fetch|axios|XMLHttpRequest',
        q26: 'sort|Collections',
        q27: 'sanitize|escape|replace',
        q28: 'try|catch|Files',
        q29: 'JSON.parse|JSON.stringify|json',
        q30: 'SELECT|executeQuery|ResultSet',
        q31: 'Math.max|reduce|for',
        q32: 'StringBuilder|reverse',
        q33: 'JWT|token|verify',
        q34: 'function|factorial|recurs',
        q35: 'synchronized|AtomicInteger|volatile',
        q36: 'batch|executeBatch|INSERT',
        q37: 'slice|limit|page',
        q38: 'logger|log|Log4j|slf4j',
        q39: 'async|await|Promise',
        q40: 'function|def|public'
    };

    function scoreCode(qkey, text){
        var pattern = codeKwStr[qkey];
        if(!pattern || !text) return false;
        var re = new RegExp(pattern, 'i');
        return re.test(text);
    }

    document.addEventListener('DOMContentLoaded', function(){
        var submitBtn = document.getElementById('pt-submit-btn');
        if(!submitBtn) return;

        submitBtn.addEventListener('click', function(){
            var form = document.getElementById('pt-form');
            if(!form) return;
            var fd   = new FormData(form);
            var name  = (fd.get('name')  || '').trim();
            var email = (fd.get('email') || '').trim();
            if(!name || !email){
                alert('氏名とメールアドレスを入力してください。');
                window.ptShowSection('info');
                return;
            }

            var answers = {};
            for(var i = 1; i <= 40; i++) answers['q' + i] = (fd.get('q' + i) || '').toString();

            var score = 0;
            for(var i = 1; i <= 20; i++){
                var t = (answers['q' + i] || '').toLowerCase();
                var kw = interviewKw['q' + i] || [];
                if(t && kw.some(function(w){ return t.indexOf(w) !== -1; })) score++;
            }
            for(var i = 21; i <= 40; i++){
                if(scoreCode('q' + i, answers['q' + i])) score++;
            }

            var btn = document.getElementById('pt-submit-btn');
            btn.disabled = true;
            btn.textContent = '送信中…';

            var endedAt = new Date();
            var payload = {
                name:    name,
                email:   email,
                answers: answers,
                score:   score,
                total:   40,
                startedAt: startedAt.toISOString(),
                endedAt:   endedAt.toISOString(),
                durationSeconds: Math.round((endedAt - startedAt) / 1000),
                lang: 'common'
            };

            fetch('/pretest/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(function(r){ return r.json(); })
            .then(function(j){
                var box = document.getElementById('pt-result');
                if(box) box.classList.add('show');
                if(j.ok){
                    if(box) box.innerHTML =
                        '<h3>✅ 送信完了！</h3>' +
                        '<p><strong>' + name + '</strong> さんの仮スコア：' +
                        '<strong>' + score + ' / 40</strong> 点<br>' +
                        'ご提出ありがとうございました。採点結果は後日お知らせします。</p>';
                    btn.textContent = '送信済み ✅';
                } else {
                    if(box) box.innerHTML =
                        '<h3 style="color:#dc2626">⚠️ 送信エラー</h3>' +
                        '<p>' + (j.error || '不明なエラー') + '</p>';
                    btn.disabled = false;
                    btn.textContent = '再送信';
                }
            })
            .catch(function(){
                var box = document.getElementById('pt-result');
                if(box){
                    box.classList.add('show');
                    box.innerHTML =
                        '<h3 style="color:#dc2626">⚠️ 通信エラー</h3>' +
                        '<p>再度お試しください。</p>';
                }
                btn.disabled = false;
                btn.textContent = '再送信';
            });
        });
    });

})();
