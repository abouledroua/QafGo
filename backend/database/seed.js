import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

async function seed() {
  console.log('Starting seed process for QafGo database...');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'qafgo_db'
    });
  } catch (err) {
    console.warn(`[seed] 'root' connection failed (${err.message}). Trying fallback user 'citrus'...`);
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: 'citrus',
      password: 'citrus21012013',
      database: process.env.DB_NAME || 'qafgo_db'
    });
  }

  // Clear existing records in reverse dependency order
  console.log('Clearing existing data...');
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  const tables = [
    'payments', 'attendance', 'tutoring_grades', 'preschool_logs', 'tahfiz_logs',
    'transfers_log', 'enrollments', 'groups', 'students', 'teachers', 'users', 'academic_years'
  ];
  for (const t of tables) {
    await connection.query(`TRUNCATE TABLE \`${t}\``);
  }
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');

  // 1. Academic Years
  console.log('Seeding academic years...');
  await connection.query(`
    INSERT INTO academic_years (id, label, start_date, end_date, is_current, is_locked) VALUES
    (1, '2024/2025', '2024-09-01', '2025-06-30', FALSE, TRUE),
    (2, '2025/2026', '2025-09-01', '2026-06-30', TRUE, FALSE)
  `);

  // 2. Users (Admin, Supervisor, Teachers)
  console.log('Seeding users...');
  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('admin123', salt);
  const teacherHash = await bcrypt.hash('teacher123', salt);

  await connection.query(`
    INSERT INTO users (id, username, password_hash, full_name, role) VALUES
    (1, 'admin', ?, 'المدير العام للمنصة', 'ADMIN'),
    (2, 'sheikh_abderrahmane', ?, 'الشيخ عبد الرحمن الكردي', 'TEACHER'),
    (3, 'ustadha_fatima', ?, 'الأستاذة فاطمة الزهراء بلقاسم', 'TEACHER'),
    (4, 'ustadh_tariq', ?, 'الأستاذ طارق بن زياد', 'TEACHER')
  `, [adminHash, teacherHash, teacherHash, teacherHash]);

  // 3. Teachers
  console.log('Seeding teachers...');
  await connection.query(`
    INSERT INTO teachers (id, full_name, phone, email, specialty, track_type) VALUES
    (1, 'فضيلة الشيخ عبد الرحمن الكردي', '0550123456', 'abderrahmane@qafgo.dz', 'القراءات العشر والتجويد', 'HALAQA'),
    (2, 'الأستاذة فاطمة الزهراء بلقاسم', '0550234567', 'fatima@qafgo.dz', 'التربية التحضيرية والتعليم المبكر', 'PRESCHOOL'),
    (3, 'الأستاذ طارق بن زياد', '0550345678', 'tariq@qafgo.dz', 'رياضيات وفيزياء - ثانوي ومتوسط', 'TUTORING'),
    (4, 'الشيخة خديجة العمري', '0550456789', 'khadija@qafgo.dz', 'حفظ المتون وبراعم القرآن', 'HALAQA'),
    (5, 'الأستاذ منير السالمي', '0550567890', 'mounir@qafgo.dz', 'لغة عربية وآدابها واللغات الأجنبية', 'TUTORING')
  `);

  // 4. Students
  console.log('Seeding students...');
  await connection.query(`
    INSERT INTO students (id, reg_no, full_name, dob, gender, academic_level, guardian_name, guardian_phone, notes) VALUES
    (1, 'QAF-2024-001', 'يوسف عبد الله المنصوري', '2012-05-14', 'MALE', 'أولى متوسط', 'عبد الله المنصوري', '0661112233', 'طالب مجد، خاتم لـ 35 حزباً'),
    (2, 'QAF-2024-002', 'مريم عثمان الفاروقي', '2013-09-20', 'FEMALE', 'خامسة ابتدائي', 'عثمان الفاروقي', '0662223344', 'حفظت 15 حزباً، متفوقة في الترتيل'),
    (3, 'QAF-2025-003', 'إبراهيم بن خلدون التونسي', '2020-03-10', 'MALE', 'تحضيري (5 سنوات)', 'خالد بن خلدون', '0663334455', 'تطور ملحوظ في مخارج الحروف والتركيز'),
    (4, 'QAF-2025-004', 'سارة أحمد النجار', '2021-08-15', 'FEMALE', 'تمهيدي (4 سنوات)', 'أحمد النجار', '0664445566', 'تشارك بنشاط في الألعاب الحركية والأناشيد'),
    (5, 'QAF-2025-005', 'أنس كمال الدين اليعقوبي', '2009-11-04', 'MALE', 'رابعة متوسط (BEM)', 'كمال الدين اليعقوبي', '0665556677', 'يستعد لشهادة التعليم المتوسط - منحة إعفاء كامل للتفوق'),
    (6, 'QAF-2025-006', 'خولة صهيب الأندلسي', '2008-01-25', 'FEMALE', 'ثالثة ثانوي (BAC)', 'صهيب الأندلسي', '0666667788', 'شعبة علوم تجريبية - بكالوريا'),
    (7, 'QAF-2025-007', 'صهيب مصطفى الهاشمي', '2014-04-18', 'MALE', 'رابعة ابتدائي', 'مصطفى الهاشمي', '0667778899', 'تحول حديثاً بين حلقات التحفيظ'),
    (8, 'QAF-2025-008', 'آية زكريا المحمودي', '2019-12-01', 'FEMALE', 'تحضيري (6 سنوات)', 'زكريا المحمودي', '0668889900', 'استيعاب سريع للأرقام والحروف الهجائية')
  `);

  // 5. Groups (Current year 2025/2026 and Previous year 2024/2025)
  console.log('Seeding groups...');
  // Past year groups (id 1, 2)
  await connection.query(`
    INSERT INTO groups (id, academic_year_id, name, track_type, subject_name, teacher_id, room, schedule, is_free, monthly_fee) VALUES
    (1, 1, 'حلقة الفرقان للمبتدئين', 'HALAQA', 'حفظ القرآن وتجويده', 1, 'قاعة أبي بكر الصديق', 'الأحد والثلاثاء 17:00 - 18:30', FALSE, 1200.00),
    (2, 1, 'فوج البراعم الصغار (تحضيري)', 'PRESCHOOL', 'الحروف والأرقام والسلوك', 2, 'قاعة الزهور', 'يومياً 08:30 - 12:00', FALSE, 2500.00)
  `);

  // Current year groups 2025/2026 (id 3 to 9)
  await connection.query(`
    INSERT INTO groups (id, academic_year_id, name, track_type, subject_name, teacher_id, room, schedule, is_free, monthly_fee) VALUES
    (3, 2, 'حلقة الإتقان والإجازة القرآنية', 'HALAQA', 'عرض القراءات والإتقان', 1, 'جناح الإمام مالك', 'السبت والاثنين والأربعاء 16:30 - 18:30', TRUE, 0.00),
    (4, 2, 'حلقة ترتيل وتثبيت الأحزاب (متقدم)', 'HALAQA', 'مراجعة وتثبيت 30 حزباً', 1, 'قاعة الفاروق عمر', 'الأحد والثلاثاء والخميس 17:00 - 19:00', FALSE, 1500.00),
    (5, 2, 'حلقة براعم النور لحفظ القرآن', 'HALAQA', 'حفظ جزء عم وتبارك والتجويد', 4, 'قاعة أم سلمة', 'السبت والأربعاء 14:00 - 16:00', FALSE, 1200.00),
    (6, 2, 'فوج الرواد التحضيري (5 - 6 سنوات)', 'PRESCHOOL', 'تهيئة مدرسية وحروف وأرقام ومهارات', 2, 'قاعة العباقرة الصغار', 'الأحد إلى الخميس 08:30 - 12:30', FALSE, 2800.00),
    (7, 2, 'فوج البراعم التمهيدي (3 - 4 سنوات)', 'PRESCHOOL', 'تنمية المهارات الحركية والسلوك والقيم', 2, 'قاعة الفراشات', 'الأحد إلى الخميس 08:30 - 11:30', FALSE, 2500.00),
    (8, 2, 'دعم الرياضيات والفيزياء (رابعة متوسط BEM)', 'TUTORING', 'حل التمارين والشهادات النموذجية', 3, 'مدرج الخوارزمي', 'الجمعة والسبت 09:00 - 11:30', FALSE, 2200.00),
    (9, 2, 'دروس تقوية العلوم والفيزياء (بكالوريا BAC)', 'TUTORING', 'منهاج البكالوريا المكثف', 3, 'مدرج ابن سينا', 'الجمعة والسبت 14:00 - 17:00', FALSE, 3200.00)
  `);

  // 6. Enrollments
  console.log('Seeding enrollments...');
  // Past year enrollments (student 1 in group 1, student 3 in group 2)
  await connection.query(`
    INSERT INTO enrollments (id, academic_year_id, student_id, group_id, enrolled_at, ended_at, status, discount_type, discount_value) VALUES
    (1, 1, 1, 1, '2024-09-10', '2025-06-25', 'COMPLETED', 'NONE', 0.00),
    (2, 1, 3, 2, '2024-09-15', '2025-06-20', 'COMPLETED', 'NONE', 0.00)
  `);

  // Current year enrollments (2025/2026)
  // Student 1: Enrolled in group 4 initially, then TRANSFERRED to group 3 (حلقة الإتقان - مجانية)!
  // Student 7: Transferred from group 5 to group 4.
  // Student 5: FULL_EXEMPTION (100% scholarship) in group 8.
  // Student 6: PERCENTAGE discount 20% in group 9.
  // Student 2: ACTIVE in group 4.
  // Student 3: ACTIVE in group 6.
  // Student 4: ACTIVE in group 7.
  // Student 8: ACTIVE in group 6.
  await connection.query(`
    INSERT INTO enrollments (id, academic_year_id, student_id, group_id, enrolled_at, ended_at, status, discount_type, discount_value, transfer_reason) VALUES
    (3, 2, 1, 4, '2025-09-02', '2025-11-15', 'TRANSFERRED', 'NONE', 0.00, 'الترقية إلى حلقة الإتقان بعد إتمام مراجعة نصف القرآن الكريم'),
    (4, 2, 1, 3, '2025-11-16', NULL, 'ACTIVE', 'NONE', 0.00, NULL),
    (5, 2, 2, 4, '2025-09-02', NULL, 'ACTIVE', 'NONE', 0.00, NULL),
    (6, 2, 3, 6, '2025-09-05', NULL, 'ACTIVE', 'NONE', 0.00, NULL),
    (7, 2, 4, 7, '2025-09-05', NULL, 'ACTIVE', 'NONE', 0.00, NULL),
    (8, 2, 5, 8, '2025-09-10', NULL, 'ACTIVE', 'FULL_EXEMPTION', 0.00, NULL),
    (9, 2, 6, 9, '2025-09-10', NULL, 'ACTIVE', 'PERCENTAGE', 20.00, NULL),
    (10, 2, 7, 5, '2025-09-03', '2025-12-01', 'TRANSFERRED', 'NONE', 0.00, 'مواءمة جدول الحضور وتكثيف وتيرة الحفظ'),
    (11, 2, 7, 4, '2025-12-02', NULL, 'ACTIVE', 'NONE', 0.00, NULL),
    (12, 2, 8, 6, '2025-09-05', NULL, 'ACTIVE', 'FIXED_AMOUNT', 500.00, NULL)
  `);

  // 7. Transfers Log (Atomic Transfers)
  console.log('Seeding transfers log...');
  await connection.query(`
    INSERT INTO transfers_log (id, academic_year_id, student_id, from_group_id, to_group_id, transfer_date, reason, created_by) VALUES
    (1, 2, 1, 4, 3, '2025-11-15 16:30:00', 'الترقية إلى حلقة الإتقان بعد إتمام مراجعة نصف القرآن الكريم بتزكية من الشيخ عبد الرحمن', 'المدير العام'),
    (2, 2, 7, 5, 4, '2025-12-01 17:00:00', 'مواءمة جدول الحضور وتكثيف وتيرة الحفظ في حلقة الترتيل المتقدم', 'إدارة شؤون الحلقات')
  `);

  // 8. Tahfiz Logs (Quranic Track progress)
  console.log('Seeding tahfiz logs...');
  await connection.query(`
    INSERT INTO tahfiz_logs (enrollment_id, date, type, surah_from, ayah_from, surah_to, ayah_to, hizb_from, hizb_to, grade, notes) VALUES
    (1, '2024-10-15', 'MEMORIZATION', 'البقرة', 1, 'البقرة', 50, 1.0, 1.5, 'MUMTAZ', 'انطلاقة ممتازة مع تطبيق أحكام المدود'),
    (1, '2025-01-20', 'MEMORIZATION', 'البقرة', 142, 'البقرة', 200, 2.0, 3.0, 'JAYYID_JIDDAN', 'حفظ متقن ومخارج سليمة'),
    (1, '2025-05-10', 'REVISION', 'آل عمران', 1, 'آل عمران', 120, 5.0, 6.5, 'MUMTAZ', 'تثبيت رائع للربع الأول والثاني'),
    (3, '2025-10-05', 'REVISION', 'النساء', 1, 'النساء', 100, 7.0, 8.5, 'MUMTAZ', 'تم استعراض الأحزاب وإتقان الوقف والابتداء'),
    (4, '2025-12-10', 'MEMORIZATION', 'المائدة', 1, 'المائدة', 60, 10.0, 11.0, 'MUMTAZ', 'أول عرض في حلقة الإتقان برواية ورش عن نافع'),
    (4, '2026-02-15', 'MEMORIZATION', 'الأنعام', 1, 'الأنعام', 70, 12.0, 13.0, 'MUMTAZ', 'استحضار عالي للمتشابهات اللفظية'),
    (5, '2025-10-12', 'MEMORIZATION', 'الكهف', 1, 'الكهف', 45, 29.5, 30.0, 'MUMTAZ', 'صوت ندي وترتيل خاشع'),
    (5, '2026-01-18', 'REVISION', 'يس', 1, 'الصافات', 50, 44.0, 45.0, 'JAYYID_JIDDAN', 'تحتاج زيادة التركيز على إدغام المتجانسين')
  `);

  // 9. PreSchool Logs (Early Learning Track)
  console.log('Seeding preschool logs...');
  await connection.query(`
    INSERT INTO preschool_logs (enrollment_id, date, skill_category, activity_title, score_rating, behavior_note) VALUES
    (2, '2024-11-10', 'LETTERS', 'التعرف على الحروف (أ، ب، ت، ث)', 'EXCELLENT', 'تفاعل ممتاز وقدرة على كتابة الحروف في الهواء'),
    (6, '2025-10-08', 'LETTERS', 'الحروف الهجائية مع الحركات القصيرة', 'EXCELLENT', 'نطق سليم لمخارج الحروف وكتابة مرتبة'),
    (6, '2025-11-14', 'NUMBERS', 'العد التصاعدي من 1 إلى 20 وحل المسائل المصورة', 'EXCELLENT', 'سرعة بديهة في جمع الأشكال الهندسية'),
    (6, '2025-12-05', 'BEHAVIOR', 'آداب الاستئذان والمشاركة مع الزملاء', 'VERY_GOOD', 'سلوك راقٍ ومبادرة في مساعدة أصدقائه في الصف'),
    (7, '2025-10-15', 'MOTOR_SKILLS', 'التلوين الدقيق واستخدام المقص الآمن والصلصال', 'EXCELLENT', 'تحكم يدوي مذهل وتنسيق لوني جميل'),
    (7, '2025-11-20', 'SOCIAL', 'نشاط مسرح العرائس والتعبير عن المشاعر', 'VERY_GOOD', 'جرأة وثقة بالنفس أثناء التحدث أمام الفوج')
  `);

  // 10. Tutoring Grades (Academic Support Track)
  console.log('Seeding tutoring grades...');
  await connection.query(`
    INSERT INTO tutoring_grades (enrollment_id, exam_title, score, max_score, exam_date, teacher_notes) VALUES
    (8, 'تقييم تشخيصي - الجذور الحسابية ونظرية طالس', 19.00, 20.00, '2025-10-18', 'إجابات نموذجية وطريقة برهان هندسية رائعة'),
    (8, 'فرض الفصل الأول - الحساب الحرفي والدوال الخطية', 18.50, 20.00, '2025-11-25', 'ممتاز، خطوة واعدة جداً نحو افتكاك معدل متفوق في الـ BEM'),
    (8, 'امتحان تجريبي شامل - شهادة التعليم المتوسط BEM', 19.50, 20.00, '2026-01-20', 'أعلى علامة في الفوج، تبارك الله'),
    (9, 'فرض الفيزياء الأول - المتابعة الزمنية لتحول كيميائي', 17.00, 20.00, '2025-11-05', 'فهم عميق لجدول التقدم والمعايرة اللونية'),
    (9, 'امتحان الفصل الأول - الظواهر الكهربائية (ثنائي القطب RC و RL)', 18.00, 20.00, '2025-12-15', 'تمكن متميز من المعادلات التفاضلية والبيانات')
  `);

  // 11. Attendance Records
  console.log('Seeding attendance records...');
  await connection.query(`
    INSERT INTO attendance (enrollment_id, date, status, notes) VALUES
    (4, '2026-02-01', 'PRESENT', 'حضور مبكر وحفظ منضبط'),
    (4, '2026-02-03', 'PRESENT', 'حضور في الموعد'),
    (4, '2026-02-05', 'EXCUSED', 'غياب مبرر لظرف عائلي'),
    (4, '2026-02-08', 'PRESENT', 'حضور ومراجعة حزب كامل'),
    (5, '2026-02-01', 'PRESENT', 'حاضرة'),
    (5, '2026-02-03', 'LATE', 'تأخر 10 دقائق بعذر'),
    (6, '2026-02-01', 'PRESENT', 'حاضر وتفاعل متميز'),
    (6, '2026-02-02', 'PRESENT', 'حاضر'),
    (8, '2026-02-06', 'PRESENT', 'حضور وحل جميع المسائل المنزلية'),
    (8, '2026-02-07', 'PRESENT', 'حاضر ومشارك بفعالية')
  `);

  // 12. Payments and Exemption Vouchers
  console.log('Seeding payments and exemption vouchers...');
  await connection.query(`
    INSERT INTO payments (academic_year_id, student_id, group_id, amount, payment_date, month_ref, receipt_no, payment_status, notes) VALUES
    (2, 2, 4, 1500.00, '2025-10-02', '2025-10', 'REC-25-00101', 'PAID', 'اشتراك شهر أكتوبر 2025 - حلقة ترتيل وتثبيت'),
    (2, 2, 4, 1500.00, '2025-11-03', '2025-11', 'REC-25-00145', 'PAID', 'اشتراك شهر نوفمبر 2025'),
    (2, 3, 6, 2800.00, '2025-10-05', '2025-10', 'REC-25-00108', 'PAID', 'رسوم شهر أكتوبر - فوج الرواد التحضيري'),
    (2, 3, 6, 2800.00, '2025-11-04', '2025-11', 'REC-25-00152', 'PAID', 'رسوم شهر نوفمبر 2025'),
    (2, 4, 7, 2500.00, '2025-10-06', '2025-10', 'REC-25-00115', 'PAID', 'رسوم شهر أكتوبر - فوج البراعم التمهيدي'),
    (2, 5, 8, 0.00, '2025-10-01', '2025-10', 'EXM-25-00001', 'EXEMPTED', 'وصل إعفاء كامل 100% - منحة التفوق الدراسي المعتمدة'),
    (2, 5, 8, 0.00, '2025-11-01', '2025-11', 'EXM-25-00012', 'EXEMPTED', 'وصل إعفاء كامل 100% - منحة التفوق لشهر نوفمبر'),
    (2, 6, 9, 2560.00, '2025-10-08', '2025-10', 'REC-25-00122', 'PAID', 'اشتراك شهر أكتوبر مع خصم 20% (المبلغ الأصلي 3200 دج)'),
    (2, 7, 4, 1500.00, '2025-12-05', '2025-12', 'REC-25-00199', 'PAID', 'اشتراك شهر ديسمبر بعد التحويل إلى حلقة الترتيل')
  `);

  console.log('Seeding completed successfully!');
  await connection.end();
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
