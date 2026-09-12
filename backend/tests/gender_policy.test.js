import db from '../config/db.js';
import { getGroupGenderPolicy } from '../controllers/settingsController.js';

async function runGenderPolicyTests() {
  console.log('--- بدء اختبارات سياسة فصل الجنسين وصلاحيات الوصول للمستخدمين ---');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ [نجاح]: ${name}`);
      passed++;
    } catch (e) {
      console.error(`❌ [فشل]: ${name} ->`, e.message);
      failed++;
    }
  }

  try {
    // 1. Database schema checks
    await test('التحقق من وجود حقل group_gender_policy في جدول school_settings', async () => {
      const [rows] = await db.query("SHOW COLUMNS FROM school_settings LIKE 'group_gender_policy'");
      if (rows.length === 0) throw new Error('حقل group_gender_policy غير موجود في school_settings');
    });

    await test('التحقق من وجود حقل gender في جدول groups', async () => {
      const [rows] = await db.query("SHOW COLUMNS FROM `groups` LIKE 'gender'");
      if (rows.length === 0) throw new Error('حقل gender غير موجود في جدول groups');
    });

    await test('التحقق من وجود حقل gender_access في جدول users', async () => {
      const [rows] = await db.query("SHOW COLUMNS FROM users LIKE 'gender_access'");
      if (rows.length === 0) throw new Error('حقل gender_access غير موجود في جدول users');
    });

    // 2. Settings Controller getGroupGenderPolicy
    await test('التحقق من دالة getGroupGenderPolicy واسترجاع السياسة الحالية', async () => {
      const policy = await getGroupGenderPolicy();
      if (policy !== 'MIXED' && policy !== 'SEPARATED') {
        throw new Error(`قيمة سياسة غير صالحة: ${policy}`);
      }
    });

    // 3. User Gender Access field in Admin user
    await test('التحقق من تعيين gender_access للمدير العام كـ ALL', async () => {
      const [rows] = await db.query("SELECT id, username, gender_access FROM users WHERE username = 'admin'");
      if (rows.length === 0) throw new Error('المستخدم admin غير موجود');
      if (rows[0].gender_access !== 'ALL') {
        throw new Error(`قيمة gender_access للمدير ليست ALL: ${rows[0].gender_access}`);
      }
    });

    // 4. Test Switching Policy to SEPARATED and testing validations
    await test('تحديث السياسة في القاعدة إلى SEPARATED والتحقق من الاسترجاع', async () => {
      await db.query("UPDATE school_settings SET group_gender_policy = 'SEPARATED' WHERE id = 1");
      const policy = await getGroupGenderPolicy();
      if (policy !== 'SEPARATED') throw new Error('فشل تحديث السياسة إلى SEPARATED');
    });

    await test('إعادة السياسة إلى MIXED للبيئة الافتراضية والتحقق', async () => {
      await db.query("UPDATE school_settings SET group_gender_policy = 'MIXED' WHERE id = 1");
      const policy = await getGroupGenderPolicy();
      if (policy !== 'MIXED') throw new Error('فشل إعادة السياسة إلى MIXED');
    });

  } catch (err) {
    console.error('Fatal test runner error:', err);
  } finally {
    console.log(`\n--- النتيجة النهائية: نجاح ${passed}، فشل ${failed} ---`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runGenderPolicyTests();
