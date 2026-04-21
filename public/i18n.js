/**
 * public/i18n.js
 * クライアントサイド多言語対応（日本語・英語・ベトナム語）
 * data-i18n="key.path" 属性を持つ要素を自動翻訳します。
 */
(function () {
    'use strict';

    // ─── 辞書 ───────────────────────────────────────────────────────────────
    var DICT = {
        ja: {
            nav: {
                home: 'ホーム', attendance: '勤怠管理', daily_report: '日報管理',
                goals: '目標管理', skillsheet: 'スキルシート', hr: '人事管理',
                payroll: '給与明細', leave_apply: '休暇申請', leave_history: '休暇履歴',
                overtime: '残業申請', board: '社内掲示板', rules: '会社規定',
                education: '教育コンテンツ', edu_site: '教育サイト', edu_test: 'テスト実施',
                edu_answers: '模範解答', edu_admin: 'テスト一覧（管理者）', links: 'リンク集',
                admin_menu: '管理者メニュー', admin_top: '管理トップ', admin_payroll: '給与管理',
                admin_leave: '休暇承認', admin_overtime: '残業申請管理',
                admin_leave_balance: '有給付与', admin_add_employee: '社員追加',
                admin_users: 'ユーザー権限', change_password: 'パスワード変更', logout: 'ログアウト',
                main_section: 'メイン', work_section: '勤怠・業務', hr_section: '人事・給与',
                info_section: '情報', edu_section: '教育', organization: '組織図'
            },
            topbar: {
                admin_badge: '管理者', notifications: '通知', mark_all_read: 'すべて既読',
                see_all: 'すべて見る', loading: '読み込み中...'
            },
            role: { admin: '管理者', employee: '社員' },
            lang: { select: '言語', ja: '日本語', en: 'English', vi: 'Tiếng Việt' },
            attendance: {
                checkin: '出勤', checkout: '退勤', gps_checkin: 'GPS出勤', gps_checkout: 'GPS退勤',
                status: '状態', working: '勤務中', off: '未出勤', date: '日付', time: '時刻'
            },
            common: {
                save: '保存', cancel: 'キャンセル', delete: '削除', edit: '編集', back: '戻る',
                submit: '送信', search: '検索', close: '閉じる', confirm: '確認',
                success: '成功', error: 'エラー', loading: '読み込み中...',
                no_data: 'データがありません', required: '必須', optional: '任意'
            },
            leave: {
                apply: '申請する', status_pending: '申請中', status_approved: '承認済',
                status_rejected: '却下', type_paid: '有給休暇', type_sick: '病気休暇', type_other: 'その他'
            }
        },
        en: {
            nav: {
                home: 'Home', attendance: 'Attendance', daily_report: 'Daily Reports',
                goals: 'Goal Management', skillsheet: 'Skill Sheet', hr: 'HR Management',
                payroll: 'Payslip', leave_apply: 'Leave Request', leave_history: 'Leave History',
                overtime: 'Overtime Request', board: 'Bulletin Board', rules: 'Company Rules',
                education: 'Education', edu_site: 'Education Site', edu_test: 'Take Test',
                edu_answers: 'Model Answers', edu_admin: 'Test List (Admin)', links: 'Links',
                admin_menu: 'Admin Menu', admin_top: 'Admin Dashboard', admin_payroll: 'Payroll Management',
                admin_leave: 'Leave Approval', admin_overtime: 'Overtime Management',
                admin_leave_balance: 'Leave Allocation', admin_add_employee: 'Add Employee',
                admin_users: 'User Permissions', change_password: 'Change Password', logout: 'Logout',
                main_section: 'Main', work_section: 'Work & Attendance', hr_section: 'HR & Payroll',
                info_section: 'Information', edu_section: 'Education', organization: 'Organization Chart'
            },
            topbar: {
                admin_badge: 'Admin', notifications: 'Notifications', mark_all_read: 'Mark all as read',
                see_all: 'See all', loading: 'Loading...'
            },
            role: { admin: 'Administrator', employee: 'Employee' },
            lang: { select: 'Language', ja: '日本語', en: 'English', vi: 'Tiếng Việt' },
            attendance: {
                checkin: 'Check In', checkout: 'Check Out', gps_checkin: 'GPS Check In',
                gps_checkout: 'GPS Check Out', status: 'Status', working: 'Working',
                off: 'Not checked in', date: 'Date', time: 'Time'
            },
            common: {
                save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', back: 'Back',
                submit: 'Submit', search: 'Search', close: 'Close', confirm: 'Confirm',
                success: 'Success', error: 'Error', loading: 'Loading...',
                no_data: 'No data available', required: 'Required', optional: 'Optional'
            },
            leave: {
                apply: 'Apply', status_pending: 'Pending', status_approved: 'Approved',
                status_rejected: 'Rejected', type_paid: 'Paid Leave', type_sick: 'Sick Leave', type_other: 'Other'
            }
        },
        vi: {
            nav: {
                home: 'Trang chủ', attendance: 'Chấm công', daily_report: 'Báo cáo ngày',
                goals: 'Quản lý mục tiêu', skillsheet: 'Bảng kỹ năng', hr: 'Quản lý nhân sự',
                payroll: 'Phiếu lương', leave_apply: 'Đăng ký nghỉ phép', leave_history: 'Lịch sử nghỉ phép',
                overtime: 'Đăng ký làm thêm giờ', board: 'Bảng thông báo', rules: 'Nội quy công ty',
                education: 'Đào tạo', edu_site: 'Trang đào tạo', edu_test: 'Làm bài kiểm tra',
                edu_answers: 'Đáp án mẫu', edu_admin: 'Danh sách bài kiểm tra (Admin)', links: 'Liên kết',
                admin_menu: 'Menu quản trị', admin_top: 'Bảng điều khiển', admin_payroll: 'Quản lý lương',
                admin_leave: 'Phê duyệt nghỉ phép', admin_overtime: 'Quản lý làm thêm giờ',
                admin_leave_balance: 'Phân bổ ngày nghỉ', admin_add_employee: 'Thêm nhân viên',
                admin_users: 'Phân quyền người dùng', change_password: 'Đổi mật khẩu', logout: 'Đăng xuất',
                main_section: 'Chính', work_section: 'Công việc & Chấm công', hr_section: 'Nhân sự & Lương',
                info_section: 'Thông tin', edu_section: 'Đào tạo', organization: 'Sơ đồ tổ chức'
            },
            topbar: {
                admin_badge: 'Quản trị viên', notifications: 'Thông báo', mark_all_read: 'Đánh dấu tất cả đã đọc',
                see_all: 'Xem tất cả', loading: 'Đang tải...'
            },
            role: { admin: 'Quản trị viên', employee: 'Nhân viên' },
            lang: { select: 'Ngôn ngữ', ja: '日本語', en: 'English', vi: 'Tiếng Việt' },
            attendance: {
                checkin: 'Chấm công vào', checkout: 'Chấm công ra', gps_checkin: 'Chấm công GPS vào',
                gps_checkout: 'Chấm công GPS ra', status: 'Trạng thái', working: 'Đang làm việc',
                off: 'Chưa chấm công', date: 'Ngày', time: 'Giờ'
            },
            common: {
                save: 'Lưu', cancel: 'Hủy', delete: 'Xóa', edit: 'Chỉnh sửa', back: 'Quay lại',
                submit: 'Gửi', search: 'Tìm kiếm', close: 'Đóng', confirm: 'Xác nhận',
                success: 'Thành công', error: 'Lỗi', loading: 'Đang tải...',
                no_data: 'Không có dữ liệu', required: 'Bắt buộc', optional: 'Tùy chọn'
            },
            leave: {
                apply: 'Đăng ký', status_pending: 'Đang chờ', status_approved: 'Đã duyệt',
                status_rejected: 'Bị từ chối', type_paid: 'Nghỉ phép có lương',
                type_sick: 'Nghỉ ốm', type_other: 'Khác'
            }
        }
    };

    // ─── 言語取得 ────────────────────────────────────────────────────────────
    var SUPPORTED = ['ja', 'en', 'vi'];
    var DEFAULT_LANG = 'ja';

    function getLang() {
        var stored = localStorage.getItem('dxpro_lang');
        return (stored && SUPPORTED.indexOf(stored) >= 0) ? stored : DEFAULT_LANG;
    }

    function setLang(code) {
        if (SUPPORTED.indexOf(code) < 0) return;
        localStorage.setItem('dxpro_lang', code);
        // サーバーセッションにも保存
        fetch('/api/lang', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lang: code })
        }).catch(function () {});
        applyLang(code);
        // ナビ更新
        updateLangUI(code);
    }

    // ─── 翻訳適用 ────────────────────────────────────────────────────────────
    function t(key, lang) {
        var dict = DICT[lang] || DICT[DEFAULT_LANG];
        var parts = key.split('.');
        var val = dict;
        for (var i = 0; i < parts.length; i++) {
            if (!val) return key;
            val = val[parts[i]];
        }
        return val || key;
    }

    function applyLang(lang) {
        // data-i18n 属性を持つ全要素を翻訳
        var els = document.querySelectorAll('[data-i18n]');
        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            var key = el.getAttribute('data-i18n');
            var translated = t(key, lang);
            // title属性の場合
            if (el.hasAttribute('data-i18n-attr')) {
                el.setAttribute(el.getAttribute('data-i18n-attr'), translated);
            } else {
                el.textContent = translated;
            }
        }
        // lang属性を更新
        document.documentElement.lang = lang;
    }

    function updateLangUI(lang) {
        var flags = { ja: '🇯🇵', en: '🇺🇸', vi: '🇻🇳' };
        var names = { ja: '日本語', en: 'English', vi: 'Tiếng Việt' };
        var btn = document.getElementById('lang-current');
        if (btn) btn.innerHTML = flags[lang] + ' ' + names[lang];
        // ドロップダウンのアクティブ状態
        SUPPORTED.forEach(function (code) {
            var item = document.getElementById('lang-opt-' + code);
            if (item) {
                item.style.fontWeight = (code === lang) ? '700' : '400';
                item.style.background = (code === lang) ? '#eff6ff' : '';
            }
        });
    }

    // ─── 言語切り替えドロップダウンを生成 ────────────────────────────────────
    function injectLangSwitcher() {
        var topbarRight = document.querySelector('.topbar-right');
        if (!topbarRight) return;

        var flags = { ja: '🇯🇵', en: '🇺🇸', vi: '🇻🇳' };
        var names = { ja: '日本語', en: 'English', vi: 'Tiếng Việt' };
        var current = getLang();

        var wrapper = document.createElement('div');
        wrapper.id = 'lang-switcher';
        wrapper.style.cssText = 'position:relative;display:inline-flex;align-items:center;';

        var btn = document.createElement('button');
        btn.id = 'lang-current';
        btn.innerHTML = flags[current] + ' ' + names[current];
        btn.style.cssText = 'background:none;border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:4px;white-space:nowrap;';
        btn.onclick = function (e) {
            e.stopPropagation();
            var dd = document.getElementById('lang-dropdown');
            dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
        };

        var dropdown = document.createElement('div');
        dropdown.id = 'lang-dropdown';
        dropdown.style.cssText = 'display:none;position:absolute;top:calc(100% + 6px);right:0;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);min-width:140px;z-index:9999;overflow:hidden;';

        SUPPORTED.forEach(function (code) {
            var item = document.createElement('button');
            item.id = 'lang-opt-' + code;
            item.innerHTML = flags[code] + ' ' + names[code];
            item.style.cssText = 'display:block;width:100%;text-align:left;padding:10px 14px;background:none;border:none;cursor:pointer;font-size:13px;color:#1e293b;';
            if (code === current) { item.style.fontWeight = '700'; item.style.background = '#eff6ff'; }
            item.onclick = function () {
                setLang(code);
                dropdown.style.display = 'none';
            };
            item.onmouseenter = function () { if (code !== getLang()) item.style.background = '#f8fafc'; };
            item.onmouseleave = function () { if (code !== getLang()) item.style.background = ''; };
            dropdown.appendChild(item);
        });

        wrapper.appendChild(btn);
        wrapper.appendChild(dropdown);

        // ベルの前に挿入
        var bell = topbarRight.querySelector('.notif-bell-wrap');
        topbarRight.insertBefore(wrapper, bell);

        // 外側クリックで閉じる
        document.addEventListener('click', function () {
            dropdown.style.display = 'none';
        });
    }

    // ─── 初期化 ──────────────────────────────────────────────────────────────
    function init() {
        var lang = getLang();
        injectLangSwitcher();
        applyLang(lang);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // グローバルAPIとして公開
    window.dxproI18n = { t: t, setLang: setLang, getLang: getLang, applyLang: applyLang };
})();
