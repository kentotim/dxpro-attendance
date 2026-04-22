// ==============================
// lib/payrollEngine.js - 給与計算エンジン
// ==============================
'use strict';
const moment = require('moment-timezone');

// ─────────────────────────────────────────────────────────────
// 2024年度 社会保険料率（協会けんぽ 東京都）
// ─────────────────────────────────────────────────────────────
const INSURANCE_RATES = {
    health:       0.0998,   // 健康保険料率（労使折半 → 本人 4.99%）
    nursing:      0.0182,   // 介護保険料率（40歳以上、労使折半 → 本人 0.91%）
    pension:      0.1830,   // 厚生年金保険料率（労使折半 → 本人 9.15%）
    employment:   0.006,    // 雇用保険料率（労働者負担 0.6%）
};

// 標準報酬月額表（等級: 報酬月額下限、標準報酬月額）
// 協会けんぽ 2024年度（一部省略・主要等級）
const STANDARD_REMUNERATION_TABLE = [
    { grade:  1, lower:     0, standard:  58000 },
    { grade:  2, lower: 63000, standard:  68000 },
    { grade:  3, lower: 73000, standard:  78000 },
    { grade:  4, lower: 83000, standard:  88000 },
    { grade:  5, lower: 93000, standard:  98000 },
    { grade:  6, lower:101000, standard: 104000 },
    { grade:  7, lower:107000, standard: 110000 },
    { grade:  8, lower:114000, standard: 118000 },
    { grade:  9, lower:122000, standard: 126000 },
    { grade: 10, lower:130000, standard: 134000 },
    { grade: 11, lower:138000, standard: 142000 },
    { grade: 12, lower:146000, standard: 150000 },
    { grade: 13, lower:155000, standard: 160000 },
    { grade: 14, lower:165000, standard: 170000 },
    { grade: 15, lower:175000, standard: 180000 },
    { grade: 16, lower:185000, standard: 190000 },
    { grade: 17, lower:195000, standard: 200000 },
    { grade: 18, lower:210000, standard: 220000 },
    { grade: 19, lower:230000, standard: 240000 },
    { grade: 20, lower:250000, standard: 260000 },
    { grade: 21, lower:270000, standard: 280000 },
    { grade: 22, lower:290000, standard: 300000 },
    { grade: 23, lower:310000, standard: 320000 },
    { grade: 24, lower:330000, standard: 340000 },
    { grade: 25, lower:350000, standard: 360000 },
    { grade: 26, lower:370000, standard: 380000 },
    { grade: 27, lower:395000, standard: 410000 },
    { grade: 28, lower:425000, standard: 440000 },
    { grade: 29, lower:455000, standard: 470000 },
    { grade: 30, lower:485000, standard: 500000 },
    { grade: 31, lower:515000, standard: 530000 },
    { grade: 32, lower:545000, standard: 560000 },
    { grade: 33, lower:575000, standard: 590000 },
    { grade: 34, lower:605000, standard: 620000 },
    { grade: 35, lower:635000, standard: 650000 },
    { grade: 50, lower:635001, standard: 650000 },  // 上限
];

function getStandardRemuneration(monthlyGross) {
    let grade = STANDARD_REMUNERATION_TABLE[0];
    for (const g of STANDARD_REMUNERATION_TABLE) {
        if (monthlyGross >= g.lower) grade = g;
        else break;
    }
    return grade.standard;
}

// ─────────────────────────────────────────────────────────────
// 源泉徴収税額表（令和6年版 甲欄・月額）
// 課税支給額（千円）→ 税額 の近似計算
// ─────────────────────────────────────────────────────────────
function calcIncomeTax(taxableMonthly, dependents = 0) {
    // 課税支給額 - 社会保険料控除後の金額
    // 簡略版：国税庁の源泉徴収税額表甲欄に基づく近似
    const t = Math.max(0, taxableMonthly);

    // 社会保険等控除後の給与等の金額から「給与所得控除後の給与等の金額」を算出
    // 月額簡易計算（扶養ゼロ基準）
    let tax = 0;
    if (t <= 88000)  { tax = 0; }
    else if (t <= 89000)  { tax = 130; }
    else if (t <= 90000)  { tax = 220; }
    else if (t <= 92000)  { tax = 310; }
    else if (t <= 94000)  { tax = 390; }
    else if (t <= 96000)  { tax = 480; }
    else if (t <= 98000)  { tax = 570; }
    else if (t <= 101000) { tax = 650; }
    else if (t <= 104000) { tax = 740; }
    else if (t <= 107000) { tax = 830; }
    else if (t <= 110000) { tax = 920; }
    else if (t <= 115000) { tax = 1010; }
    else if (t <= 120000) { tax = 1100; }
    else if (t <= 125000) { tax = 1190; }
    else if (t <= 130000) { tax = 1280; }
    else if (t <= 135000) { tax = 1370; }
    else if (t <= 140000) { tax = 1460; }
    else if (t <= 145000) { tax = 1550; }
    else if (t <= 150000) { tax = 1640; }
    else if (t <= 160000) { tax = 1830; }
    else if (t <= 170000) { tax = 2010; }
    else if (t <= 180000) { tax = 2200; }
    else if (t <= 190000) { tax = 2390; }
    else if (t <= 200000) { tax = 2580; }
    else if (t <= 220000) { tax = 2970; }
    else if (t <= 240000) { tax = 3480; }
    else if (t <= 260000) { tax = 4270; }
    else if (t <= 280000) { tax = 5020; }
    else if (t <= 300000) { tax = 5850; }
    else if (t <= 320000) { tax = 6720; }
    else if (t <= 340000) { tax = 7800; }
    else if (t <= 360000) { tax = 8880; }
    else if (t <= 380000) { tax = 9960; }
    else if (t <= 400000) { tax = 11000; }
    else if (t <= 420000) { tax = 12100; }
    else if (t <= 440000) { tax = 13200; }
    else if (t <= 460000) { tax = 14300; }
    else if (t <= 480000) { tax = 15500; }
    else if (t <= 500000) { tax = 16900; }
    else if (t <= 520000) { tax = 18300; }
    else if (t <= 540000) { tax = 19700; }
    else if (t <= 560000) { tax = 21100; }
    else if (t <= 580000) { tax = 22500; }
    else if (t <= 600000) { tax = 23900; }
    else { tax = Math.round(t * 0.04); }

    // 扶養親族控除（1人あたり約1,600円/月 減税）
    const dependentCredit = dependents * 1600;
    return Math.max(0, tax - dependentCredit);
}

// ─────────────────────────────────────────────────────────────
// 時間単価の計算
// ─────────────────────────────────────────────────────────────
function calcHourlyRate(master) {
    if (master.hourlyRate > 0) return master.hourlyRate;
    const days = master.workingDaysPerMonth || 20;
    const hours = master.workingHoursPerDay || 8;
    return Math.round(master.baseSalary / (days * hours));
}

// ─────────────────────────────────────────────────────────────
// メイン計算関数
// ─────────────────────────────────────────────────────────────
/**
 * 1名分の給与明細を計算する
 * @param {object} master - PayrollMasterドキュメント（lean）
 * @param {object} attendance - 勤怠集計 { workDays, absentDays, overtimeHours, nightHours, holidayHours }
 * @param {number} age - 年齢（介護保険判定用）
 * @returns {object} 計算結果
 */
function calcPayroll(master, attendance, age = 30) {
    const hourlyRate = calcHourlyRate(master);

    // ─── 支給 ───────────────────────────────────────────────
    const baseSalary = master.baseSalary;

    // 欠勤控除（日割り）
    const dailyRate = baseSalary / (master.workingDaysPerMonth || 20);
    const absentDeduction = Math.round(dailyRate * (attendance.absentDays || 0));

    // 残業代（125% × 時間単価）
    const overtimePay = Math.round(hourlyRate * 1.25 * (attendance.overtimeHours || 0));

    // 深夜手当（25% × 時間単価 ※通常残業と別途加算）
    const nightPay = Math.round(hourlyRate * 0.25 * (attendance.nightHours || 0));

    // 休日手当（135%）
    const holidayPay = Math.round(hourlyRate * 1.35 * (attendance.holidayHours || 0));

    // 各種手当
    const positionAllowance  = master.positionAllowance || 0;
    const housingAllowance   = master.housingAllowance || 0;
    const familyAllowance    = master.familyAllowance || 0;
    const commuteAllowance   = master.commuteAllowance || 0;  // 非課税
    const otherAllowancesTotal = (master.otherAllowances || []).reduce((s, a) => s + (a.amount || 0), 0);

    // 課税支給額（通勤手当を除く）
    const taxableGross = baseSalary - absentDeduction
        + overtimePay + nightPay + holidayPay
        + positionAllowance + housingAllowance + familyAllowance
        + otherAllowancesTotal;

    // 総支給額（通勤手当含む）
    const totalGross = taxableGross + commuteAllowance;

    // ─── 控除 ───────────────────────────────────────────────
    let healthIns, nursingIns, pensionIns, employmentIns;

    if (master.autoCalcInsurance) {
        const standard = getStandardRemuneration(taxableGross);
        healthIns    = Math.round(standard * INSURANCE_RATES.health    / 2);
        nursingIns   = age >= 40 ? Math.round(standard * INSURANCE_RATES.nursing / 2) : 0;
        pensionIns   = Math.round(standard * INSURANCE_RATES.pension   / 2);
        employmentIns = Math.round(totalGross * INSURANCE_RATES.employment);
    } else {
        healthIns     = master.healthInsurance || 0;
        nursingIns    = master.nursingInsurance || 0;
        pensionIns    = master.pensionInsurance || 0;
        employmentIns = master.employmentInsurance || 0;
    }

    const totalSocialInsurance = healthIns + nursingIns + pensionIns + employmentIns;

    // 課税標準額（源泉所得税計算用）
    const taxBase = Math.max(0, taxableGross - totalSocialInsurance);
    const incomeTax = calcIncomeTax(taxBase, master.dependents || 0);

    // 合計控除
    const totalDeduction = totalSocialInsurance + incomeTax + absentDeduction;

    // 差引支給額
    const netPay = totalGross - totalDeduction;

    return {
        // 支給
        baseSalary,
        absentDeduction,
        overtimePay,
        nightPay,
        holidayPay,
        positionAllowance,
        housingAllowance,
        familyAllowance,
        commuteAllowance,
        otherAllowancesTotal,
        taxableGross,
        totalGross,
        // 控除
        healthInsurance:    healthIns,
        nursingInsurance:   nursingIns,
        pensionInsurance:   pensionIns,
        employmentInsurance: employmentIns,
        totalSocialInsurance,
        incomeTax,
        totalDeduction,
        netPay,
        // 勤怠
        workDays:      attendance.workDays || 0,
        absentDays:    attendance.absentDays || 0,
        overtimeHours: attendance.overtimeHours || 0,
        nightHours:    attendance.nightHours || 0,
        holidayHours:  attendance.holidayHours || 0,
        hourlyRate
    };
}

// ─────────────────────────────────────────────────────────────
// 月次勤怠集計（AttendanceコレクションからPayroll用データを生成）
// ─────────────────────────────────────────────────────────────
async function aggregateAttendance(userId, year, month) {
    const { Attendance } = require('../models');
    const from = moment.tz(`${year}-${String(month).padStart(2,'0')}-01`, 'Asia/Tokyo').startOf('month').toDate();
    const to   = moment.tz(`${year}-${String(month).padStart(2,'0')}-01`, 'Asia/Tokyo').endOf('month').toDate();

    const records = await Attendance.find({ userId, date: { $gte: from, $lte: to } }).lean();

    let workDays = 0, absentDays = 0, overtimeHours = 0, nightHours = 0, holidayHours = 0;

    for (const r of records) {
        const day = moment(r.date).tz('Asia/Tokyo');
        const isWeekend = day.day() === 0 || day.day() === 6;

        if (!r.checkIn && !r.checkOut) {
            if (!isWeekend) absentDays++;
            continue;
        }
        workDays++;

        if (r.checkIn && r.checkOut) {
            const checkIn  = moment(r.checkIn).tz('Asia/Tokyo');
            const checkOut = moment(r.checkOut).tz('Asia/Tokyo');
            const totalHours = (checkOut - checkIn) / 3600000;
            const standardHours = 8;
            const lunchBreak = 1;
            const actualHours = Math.max(0, totalHours - lunchBreak);

            if (isWeekend) {
                holidayHours += actualHours;
            } else if (actualHours > standardHours) {
                overtimeHours += actualHours - standardHours;
            }

            // 深夜（22:00〜翌5:00）の計算
            const nightStart = moment(r.checkIn).tz('Asia/Tokyo').hour(22).minute(0).second(0);
            const nightEnd   = moment(r.checkIn).tz('Asia/Tokyo').add(1,'day').hour(5).minute(0).second(0);
            if (checkOut.isAfter(nightStart)) {
                const overlap = Math.min(checkOut.valueOf(), nightEnd.valueOf()) - Math.max(checkIn.valueOf(), nightStart.valueOf());
                if (overlap > 0) nightHours += overlap / 3600000;
            }
        }
    }

    // 所定労働日数（平日カウント）
    const businessDays = Array.from({ length: moment(from).daysInMonth() }, (_, i) => {
        const d = moment(from).add(i, 'days');
        return d.day() !== 0 && d.day() !== 6;
    }).filter(Boolean).length;

    return {
        workDays,
        absentDays: Math.max(0, businessDays - workDays),
        overtimeHours: Math.round(overtimeHours * 10) / 10,
        nightHours:    Math.round(nightHours * 10) / 10,
        holidayHours:  Math.round(holidayHours * 10) / 10,
        businessDays
    };
}

module.exports = { calcPayroll, calcHourlyRate, aggregateAttendance, calcIncomeTax, getStandardRemuneration };
