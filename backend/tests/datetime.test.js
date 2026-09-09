import { DateTimeFormatter, formatDate, formatTime, formatDateTime } from '../utils/dateTimeFormatter.js';

console.log('--- بدء اختبار وحدة معالجة وتنسيق التواريخ والأوقات (DateTimeFormatter Test) ---');

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ [نجاح]: ${testName}`);
    passed++;
  } else {
    console.error(`❌ [فشل]: ${testName}`);
    failed++;
  }
}

// 1. Test JJ/MM/AAAA formatting with 2-digit zero padding
const d1 = new Date(2026, 8, 9, 14, 5, 8); // 9 Sept 2026 14:05:08
assert(DateTimeFormatter.formatDate(d1) === '09/09/2026', 'تنسيق التاريخ بصيغة JJ/MM/AAAA مع أصفار الحشو');
assert(formatDate(new Date(2025, 3, 5)) === '05/04/2025', 'تنسيق يوم وشهر أحادي (5 أفريل 2025 -> 05/04/2025)');

// 2. Test Time formatting 'HH:SS' / 'HH:MM'
assert(DateTimeFormatter.formatTime(d1) === '14:05', 'تنسيق الوقت الافتراضي بصيغة HH:SS (14:05)');
assert(DateTimeFormatter.formatTime(d1, { withSeconds: true }) === '14:05:08', 'تنسيق الوقت مع الثواني (14:05:08)');

// 3. Test formatDateTime 'JJ/MM/AAAA HH:SS'
assert(DateTimeFormatter.formatDateTime(d1) === '09/09/2026 14:05', 'تنسيق التاريخ والوقت معاً: JJ/MM/AAAA HH:SS');

// 4. Test String ISO input
const iso = '2026-11-20T08:30:00.000Z';
const dateFromIso = DateTimeFormatter.formatDate(iso);
assert(typeof dateFromIso === 'string' && dateFromIso.includes('2026'), 'التعامل السليم مع سلاسل ISO 8601');

// 5. Test Fallback on null/undefined/invalid
assert(DateTimeFormatter.formatDate(null) === '-', 'إرجاع القيمة الافتراضية عند تمرير null');
assert(DateTimeFormatter.formatDate('invalid-date', 'غير متوفر') === 'غير متوفر', 'إرجاع القيمة البديلة عند تمرير تاريخ غير صالح');

// 6. Test Parsing JJ/MM/AAAA
const parsed = DateTimeFormatter.parse('25/12/2025');
assert(parsed instanceof Date && parsed.getDate() === 25 && parsed.getMonth() === 11 && parsed.getFullYear() === 2025, 'تحليل صيغة JJ/MM/AAAA إلى كائن Date أصلي');

// 7. Test toInputDate & toInputTime
const inputDate = DateTimeFormatter.toInputDate(new Date(2026, 0, 5));
assert(inputDate === '2026-01-05', 'التحويل إلى صيغة حقل الإدخال YYYY-MM-DD');

console.log(`\n--- نتيجة اختبارات DateTimeFormatter: نجح ${passed} من أصل ${passed + failed} ---`);
if (failed > 0) process.exit(1);
