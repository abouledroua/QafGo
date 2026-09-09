async function runTests() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('--- بدء الفحص الآلي الشامل لجميع وحدات منصة قاف غو ---');

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

  // 1. Health & Academic Years
  await test('فحص تشغيل الخادم واسترجاع السنوات الدراسية', async () => {
    const res = await fetch(`${BASE_URL}/academic-years`).then(r => r.json());
    if (!res.success || res.data.length < 2) throw new Error('فشل جلب السنوات الدراسية');
    const current = res.data.find(y => y.is_current);
    if (!current || current.label !== '2025/2026') throw new Error('السنة الحالية غير متوافقة');
  });

  // 2. Auth Login
  let token;
  await test('تسجيل دخول المشرف العام واستلام JWT', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    }).then(r => r.json());
    if (!res.success || !res.token) throw new Error('فشل تسجيل الدخول');
    token = res.token;
  });

  // 3. Groups partitioned by 3 tracks
  await test('استرجاع الأفواج مصنفة حسب المسارات الثلاثة', async () => {
    const res = await fetch(`${BASE_URL}/groups?academic_year_id=2`).then(r => r.json());
    if (!res.success || res.data.length === 0) throw new Error('لا توجد أفواج مسجلة');
    const tracks = new Set(res.data.map(g => g.track_type));
    if (!tracks.has('HALAQA') || !tracks.has('PRESCHOOL') || !tracks.has('TUTORING')) {
      throw new Error('أحد المسارات الثلاثة مفقود');
    }
  });

  // 4. Free Group validation
  await test('التحقق من وجود حلقة مجانية برسم 0.00 دج', async () => {
    const res = await fetch(`${BASE_URL}/groups?academic_year_id=2&track_type=HALAQA`).then(r => r.json());
    const freeGroup = res.data.find(g => g.is_free == 1);
    if (!freeGroup || parseFloat(freeGroup.monthly_fee) !== 0) {
      throw new Error('لم يتم العثور على الحلقة المجانية المعتمدة');
    }
  });

  // 5. Complete Lifetime Dossier (السجل التاريخي الشامل للطالب)
  await test('استرجاع السجل التاريخي الشامل والخط الزمني متعدد السنوات للطالب', async () => {
    const res = await fetch(`${BASE_URL}/students/1/history`).then(r => r.json());
    if (!res.success) throw new Error('فشل جلب السجل التاريخي');
    const { student, summary, timeline, enrollments, transfers } = res.data;
    if (student.reg_no !== 'QAF-2024-001') throw new Error('بيانات الطالب غير متطابقة');
    if (timeline.length === 0) throw new Error('الخط الزمني فارغ');
    if (summary.maxMemorizedHizb < 10) throw new Error('رصيد الأحزاب غير دقيق');
    if (transfers.length === 0) throw new Error('سجل التحويلات التاريخي مفقود');
  });

  // 6. Atomic Transfer Transaction Execution
  await test('تنفيذ عملية تحويل ذري بين فوجين (Atomic Transfer) وتوثيقها', async () => {
    const histBefore = await fetch(`${BASE_URL}/students/2/history`).then(r => r.json());
    const activeEnrollment = histBefore.data.enrollments.find(e => e.status === 'ACTIVE');
    if (!activeEnrollment) {
      console.log('الطالب 2 لديه بالفعل تحويل مسجل');
      return;
    }
    const targetGroup = activeEnrollment.group_id === 3 ? 4 : 3;

    const transferRes = await fetch(`${BASE_URL}/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        student_id: 2,
        academic_year_id: 2,
        current_enrollment_id: activeEnrollment.id,
        target_group_id: targetGroup,
        reason: 'اختبار المعاملة الذرية التلقائية والتحويل لحلقة الإتقان المجانية',
        discount_type: 'NONE',
        discount_value: 0
      })
    }).then(r => r.json());

    if (!transferRes.success) throw new Error('فشل تنفيذ المعاملة الذرية: ' + transferRes.message);

    // Verify student 2 history updated with the transfer
    const histRes = await fetch(`${BASE_URL}/students/2/history`).then(r => r.json());
    const hasTransfer = histRes.data.transfers.some(t => t.to_group_id === targetGroup);
    if (!hasTransfer) throw new Error('لم يتم إدراج التحويل في الأرشيف الدائم');
  });

  // 7. Finance & Exemption rules
  await test('التحقق من قواعد المالية واستثناء الأفواج المجانية والمنح 100%', async () => {
    const res = await fetch(`${BASE_URL}/finance/unpaid?academic_year_id=2&month_ref=2025-10`).then(r => r.json());
    if (!res.success) throw new Error('فشل فحص المستحقات');
    
    // Ensure student 1 (in free group) and student 5 (FULL_EXEMPTION) are NOT in unpaid list
    const containsFreeStudent = res.data.some(s => s.student_id === 1);
    const containsExemptStudent = res.data.some(s => s.student_id === 5);
    if (containsFreeStudent) throw new Error('تم احتساب مستحقات على طالب في فوج مجاني بالخطأ!');
    if (containsExemptStudent) throw new Error('تم احتساب مستحقات على طالب معفى 100% بالخطأ!');
  });

  // 8. School Settings Profile & Preferences
  await test('استرجاع إعدادات المدرسة والنظام (GET /api/settings)', async () => {
    const res = await fetch(`${BASE_URL}/settings`).then(r => r.json());
    if (!res.success) throw new Error('فشل جلب إعدادات المدرسة');
    if (!res.data.school_name) throw new Error('اسم المؤسسة مفقود في الإعدادات');
    if (res.data.late_attendance_threshold_minutes === undefined) throw new Error('حقل عتبة التأخر مفقود');
    if (res.data.enable_quran_track === undefined) throw new Error('حقل تفعيل المسار القرآني مفقود');
  });

  // 9. Update School Settings
  await test('تحديث إعدادات المدرسة والنظام والتحقق من الحفظ الذري (PUT /api/settings)', async () => {
    const updateRes = await fetch(`${BASE_URL}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        school_name: 'مؤسسة قاف غو النموذجية للتعليم والقرآن',
        phone_primary: '0555 12 34 56',
        city: 'الجزائر العاصمة',
        late_attendance_threshold_minutes: 20,
        default_max_absences_warning: 4,
        currency_symbol: 'د.ج'
      })
    }).then(r => r.json());

    if (!updateRes.success) throw new Error('فشل تحديث الإعدادات: ' + updateRes.message);
    if (updateRes.data.school_name !== 'مؤسسة قاف غو النموذجية للتعليم والقرآن') {
      throw new Error('اسم المؤسسة لم يتم تحديثه بالشكل الصحيح');
    }

    // Verify cache invalidation & persistence via fresh GET
    const freshRes = await fetch(`${BASE_URL}/settings`).then(r => r.json());
    if (freshRes.data.late_attendance_threshold_minutes !== 20) {
      throw new Error('عتبة التأخر لم تحفظ في قاعدة البيانات');
    }
  });

  console.log(`\n--- نتيجة الاختبارات: تم بنجاح ${passed} من أصل ${passed + failed} اختبار ---`);
  if (failed > 0) process.exit(1);
}

runTests();

