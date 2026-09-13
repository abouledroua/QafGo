import pool from '../config/db.js';
import { logActivity } from '../utils/auditLogger.js';
import { getGroupGenderPolicy } from './settingsController.js';

export const getStudents = async (req, res) => {
  try {
    const { academic_year_id, track_type, search, status, gender } = req.query;
    const policy = await getGroupGenderPolicy();

    let query = `
      SELECT DISTINCT
        s.*,
        e.id AS enrollment_id,
        e.academic_year_id,
        e.status AS enrollment_status,
        e.discount_type,
        e.discount_value,
        e.enrolled_at,
        e.ended_at,
        g.id AS group_id,
        g.name AS group_name,
        g.track_type,
        g.is_free,
        g.monthly_fee,
        ay.label AS academic_year_label,
        t.full_name AS teacher_name
      FROM students s
      LEFT JOIN enrollments e ON s.id = e.student_id
      LEFT JOIN groups g ON e.group_id = g.id
      LEFT JOIN academic_years ay ON e.academic_year_id = ay.id
      LEFT JOIN teachers t ON g.teacher_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (academic_year_id) {
      query += ` AND (e.academic_year_id = ? OR e.academic_year_id IS NULL)`;
      params.push(academic_year_id);
    }

    if (track_type) {
      query += ` AND g.track_type = ?`;
      params.push(track_type);
    }

    if (status) {
      query += ` AND e.status = ?`;
      params.push(status);
    }

    if (gender) {
      query += ` AND s.gender = ?`;
      params.push(gender);
    }

    // Gender access restriction when policy is SEPARATED
    if (policy === 'SEPARATED' && req.user?.gender_access && req.user.gender_access !== 'ALL') {
      query += ` AND s.gender = ?`;
      params.push(req.user.gender_access);
    }

    if (search) {
      query += ` AND (s.full_name LIKE ? OR s.reg_no LIKE ? OR s.guardian_name LIKE ? OR s.guardian_phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY s.id DESC`;

    const [rows] = await pool.query(query, params);

    // Group by student ID to collect multiple enrollments cleanly if any
    const studentsMap = new Map();
    for (const row of rows) {
      if (!studentsMap.has(row.id)) {
        studentsMap.set(row.id, {
          id: row.id,
          reg_no: row.reg_no,
          full_name: row.full_name,
          dob: row.dob,
          gender: row.gender,
          academic_level: row.academic_level,
          guardian_name: row.guardian_name,
          guardian_phone: row.guardian_phone,
          photo_url: row.photo_url,
          notes: row.notes,
          created_at: row.created_at,
          enrollments: []
        });
      }
      if (row.enrollment_id) {
        studentsMap.get(row.id).enrollments.push({
          id: row.enrollment_id,
          academic_year_id: row.academic_year_id,
          academic_year_label: row.academic_year_label,
          status: row.enrollment_status,
          discount_type: row.discount_type,
          discount_value: row.discount_value,
          enrolled_at: row.enrolled_at,
          ended_at: row.ended_at,
          group_id: row.group_id,
          group_name: row.group_name,
          track_type: row.track_type,
          is_free: row.is_free,
          monthly_fee: row.monthly_fee,
          teacher_name: row.teacher_name
        });
      }
    }

    // Fetch payments for current month to compute debt / unpaid dues status
    const currentMonthRef = new Date().toISOString().slice(0, 7);
    const [monthPayments] = await pool.query(
      `SELECT student_id, group_id, payment_status, amount FROM payments WHERE month_ref = ?`,
      [currentMonthRef]
    );

    // Fetch product sales remaining debt for all students
    const [productDebts] = await pool.query(`
      SELECT student_id, SUM(remaining_debt) AS total_product_debt, COUNT(*) AS unpaid_sales_count
      FROM product_sales
      WHERE remaining_debt > 0
      GROUP BY student_id
    `);
    const productDebtMap = new Map();
    productDebts.forEach(pd => {
      productDebtMap.set(pd.student_id, {
        debt: parseFloat(pd.total_product_debt || 0),
        count: parseInt(pd.unpaid_sales_count || 0, 10)
      });
    });

    // Compute financial / debt status for each student
    const resultList = [];
    for (const student of studentsMap.values()) {
      const activeEnrollments = student.enrollments.filter(e => e.status === 'ACTIVE');
      let hasUnpaid = false;
      let tuitionUnpaidAmount = 0;
      const unpaidGroups = [];

      if (activeEnrollments.length === 0) {
        student.financial_status = 'NOT_ENROLLED';
      } else {
        const allFree = activeEnrollments.every(e => e.is_free === 1 || e.is_free === true);
        if (allFree) {
          student.financial_status = 'FREE';
        } else {
          for (const en of activeEnrollments) {
            if (en.is_free !== 1 && en.discount_type !== 'FULL_EXEMPTION') {
              const hasPaid = monthPayments.some(
                p => p.student_id === student.id && p.group_id === en.group_id
              );
              if (!hasPaid) {
                let fee = parseFloat(en.monthly_fee || 0);
                if (en.discount_type === 'PERCENTAGE') {
                  fee -= (fee * parseFloat(en.discount_value || 0) / 100);
                } else if (en.discount_type === 'FIXED_AMOUNT') {
                  fee = Math.max(0, fee - parseFloat(en.discount_value || 0));
                }
                if (fee > 0) {
                  hasUnpaid = true;
                  tuitionUnpaidAmount += fee;
                  unpaidGroups.push(en.group_name);
                }
              }
            }
          }

          if (hasUnpaid) {
            student.financial_status = 'UNPAID';
          } else {
            const hasExemption = activeEnrollments.some(e => e.discount_type === 'FULL_EXEMPTION');
            student.financial_status = hasExemption ? 'EXEMPTED' : 'PAID';
          }
        }
      }

      // Merge product sales debt
      const prodDebtInfo = productDebtMap.get(student.id) || { debt: 0, count: 0 };
      const productDebt = prodDebtInfo.debt;
      const totalUnpaidAmount = tuitionUnpaidAmount + productDebt;

      if (productDebt > 0) {
        hasUnpaid = true;
        student.financial_status = 'UNPAID';
      }

      student.tuition_debt = tuitionUnpaidAmount;
      student.product_debt = productDebt;
      student.has_unpaid = totalUnpaidAmount > 0;
      student.unpaid_amount = totalUnpaidAmount;
      student.unpaid_groups = unpaidGroups;
      student.unpaid_month = currentMonthRef;

      // Filter by financial status if requested in query
      if (req.query.financial_status) {
        if (req.query.financial_status === 'UNPAID' && !student.has_unpaid) continue;
        if (req.query.financial_status === 'PAID' && (student.has_unpaid || student.financial_status === 'NOT_ENROLLED')) continue;
      }

      resultList.push(student);
    }

    return res.json({ success: true, data: resultList });
  } catch (error) {
    console.error('getStudents error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const [students] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);

    if (students.length === 0) {
      return res.status(404).json({ success: false, message: req.t('student_not_found') });
    }

    const student = students[0];

    const policy = await getGroupGenderPolicy();
    if (policy === 'SEPARATED' && req.user?.gender_access && req.user.gender_access !== 'ALL') {
      if (student.gender !== req.user.gender_access) {
        return res.status(403).json({
          success: false,
          message: req.t('forbidden_gender_access') || 'ليس لديك صلاحية للوصول إلى بيانات هذا الطالب'
        });
      }
    }

    // Current & past enrollments
    const [enrollments] = await pool.query(`
      SELECT 
        e.*,
        ay.label AS academic_year_label,
        ay.is_current AS is_year_current,
        g.name AS group_name,
        g.track_type,
        g.gender AS group_gender,
        g.is_free,
        g.monthly_fee,
        t.full_name AS teacher_name
      FROM enrollments e
      JOIN academic_years ay ON e.academic_year_id = ay.id
      JOIN groups g ON e.group_id = g.id
      LEFT JOIN teachers t ON g.teacher_id = t.id
      WHERE e.student_id = ?
      ORDER BY ay.start_date DESC, e.id DESC
    `, [id]);

    return res.json({ success: true, data: { ...student, enrollments } });
  } catch (error) {
    console.error('getStudentById error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const createStudent = async (req, res) => {
  try {
    const {
      full_name,
      dob,
      gender,
      academic_level,
      guardian_name,
      guardian_phone,
      photo_url,
      notes,
      // optional initial enrollment
      academic_year_id,
      group_id,
      discount_type = 'NONE',
      discount_value = 0.00
    } = req.body;

    if (!full_name || !guardian_phone) {
      return res.status(400).json({ success: false, message: req.t('student_required_fields') });
    }

    const policy = await getGroupGenderPolicy();
    const finalGender = gender || 'MALE';

    // Access check
    if (policy === 'SEPARATED' && req.user?.gender_access && req.user.gender_access !== 'ALL') {
      if (finalGender !== req.user.gender_access) {
        return res.status(403).json({
          success: false,
          message: req.t('forbidden_gender_access') || 'غير مصرح لك بإنشاء طالب لهذا الجنس'
        });
      }
    }

    // Check initial group gender matching if provided
    if (academic_year_id && group_id && policy === 'SEPARATED') {
      const [gRows] = await pool.query('SELECT gender FROM groups WHERE id = ?', [group_id]);
      if (gRows.length > 0 && gRows[0].gender && gRows[0].gender !== 'ALL') {
        if (finalGender !== gRows[0].gender) {
          return res.status(400).json({
            success: false,
            message: req.t('student_gender_mismatch_group') || 'لا يمكن تسجيل طالب في فوج مخصص للجنس الآخر (يجب تطابق الجنس)'
          });
        }
      }
    }

    const yearSuffix = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reg_no = `QAF-${yearSuffix}-${randomSuffix}`;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [studentResult] = await connection.query(`
        INSERT INTO students (reg_no, full_name, dob, gender, academic_level, guardian_name, guardian_phone, photo_url, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        reg_no,
        full_name,
        dob || null,
        finalGender,
        academic_level || 'ابتدائي',
        guardian_name || null,
        guardian_phone,
        photo_url || null,
        notes || null
      ]);

      const studentId = studentResult.insertId;

      // Optional initial enrollment
      if (academic_year_id && group_id) {
        const today = new Date().toISOString().split('T')[0];
        await connection.query(`
          INSERT INTO enrollments (academic_year_id, student_id, group_id, enrolled_at, status, discount_type, discount_value)
          VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
        `, [
          academic_year_id,
          studentId,
          group_id,
          today,
          discount_type,
          discount_value
        ]);
      }

      await connection.commit();

      logActivity(req, {
        action_type: 'CREATE',
        data_type: 'STUDENT',
        entity_id: studentId,
        entity_name: full_name,
        details: `إضافة طالب جديد: ${full_name} (${reg_no}) [الجنس: ${finalGender}] - هاتف الولي: ${guardian_phone}`
      });

      return res.status(201).json({
        success: true,
        message: `${req.t('student_created_success')} (${reg_no})`,
        studentId,
        reg_no
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('createStudent error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      full_name,
      dob,
      gender,
      academic_level,
      guardian_name,
      guardian_phone,
      photo_url,
      notes
    } = req.body;

    if (!full_name || !guardian_phone) {
      return res.status(400).json({ success: false, message: req.t('student_required_fields') });
    }

    const [existing] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: req.t('student_not_found') });
    }
    const current = existing[0];

    const policy = await getGroupGenderPolicy();
    const finalGender = gender || current.gender || 'MALE';

    if (policy === 'SEPARATED' && req.user?.gender_access && req.user.gender_access !== 'ALL') {
      if (current.gender !== req.user.gender_access || finalGender !== req.user.gender_access) {
        return res.status(403).json({
          success: false,
          message: req.t('forbidden_gender_access') || 'ليس لديك صلاحية لتعديل بيانات هذا الطالب'
        });
      }
    }

    if (policy === 'SEPARATED' && finalGender !== current.gender) {
      const [enrolledGroups] = await pool.query(`
        SELECT g.name, g.gender 
        FROM enrollments e
        JOIN groups g ON e.group_id = g.id
        WHERE e.student_id = ? AND e.status = 'ACTIVE' AND g.gender = ?
      `, [id, current.gender]);

      if (enrolledGroups.length > 0) {
        const groupNames = enrolledGroups.map(g => g.name).join(', ');
        return res.status(400).json({
          success: false,
          message: req.t('student_gender_change_has_groups', { groups: groupNames }) ||
            `لا يمكن تغيير جنس الطالب لأنه مسجل حالياً في أفواج مخصصة لجنسه السابق (${groupNames}). يجب إلغاء تسجيله أولاً.`
        });
      }
    }

    await pool.query(`
      UPDATE students 
      SET full_name = ?, dob = ?, gender = ?, academic_level = ?, guardian_name = ?, guardian_phone = ?, photo_url = ?, notes = ?
      WHERE id = ?
    `, [
      full_name,
      dob || null,
      finalGender,
      academic_level || null,
      guardian_name || null,
      guardian_phone,
      photo_url !== undefined ? (photo_url || null) : current.photo_url,
      notes || null,
      id
    ]);

    logActivity(req, {
      action_type: 'UPDATE',
      data_type: 'STUDENT',
      entity_id: id,
      entity_name: full_name,
      details: `تعديل بيانات الطالب: ${full_name} (رقم التسجيل: ${current.reg_no}) [الجنس: ${finalGender}]`
    });

    return res.json({ success: true, message: req.t('student_updated_success') });
  } catch (error) {
    console.error('updateStudent error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: req.t('student_not_found') });
    }
    const student = existing[0];

    // Check if student is assigned to any active group
    const [activeEnrollments] = await pool.query(`
      SELECT e.id, g.name AS group_name 
      FROM enrollments e
      JOIN groups g ON e.group_id = g.id
      WHERE e.student_id = ? AND e.status = 'ACTIVE'
    `, [id]);

    if (activeEnrollments.length > 0) {
      const groupNames = activeEnrollments.map(e => `"${e.group_name}"`).join('، ');
      return res.status(400).json({
        success: false,
        message: req.t('student_cannot_delete_active_enrollment', {
          name: student.full_name,
          groups: groupNames
        })
      });
    }

    // Delete student
    await pool.query('DELETE FROM students WHERE id = ?', [id]);

    logActivity(req, {
      action_type: 'DELETE',
      data_type: 'STUDENT',
      entity_id: id,
      entity_name: student.full_name,
      details: `حذف سجل الطالب: ${student.full_name} (${student.reg_no})`
    });

    return res.json({
      success: true,
      message: `${req.t('student_deleted_success')} (${student.full_name})`
    });
  } catch (error) {
    console.error('deleteStudent error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// Complete Lifetime Dossier (السجل التاريخي الشامل للطالب)
export const getStudentLifetimeDossier = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify student exists
    const [students] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);
    if (students.length === 0) {
      return res.status(404).json({ success: false, message: req.t('student_not_found') });
    }
    const student = students[0];

    // 1. All Enrollments across all years
    const [enrollments] = await pool.query(`
      SELECT 
        e.*,
        ay.label AS academic_year_label,
        ay.start_date AS year_start,
        ay.end_date AS year_end,
        ay.is_current,
        g.name AS group_name,
        g.track_type,
        g.subject_name,
        g.is_free,
        g.monthly_fee,
        t.full_name AS teacher_name,
        t.specialty AS teacher_specialty
      FROM enrollments e
      JOIN academic_years ay ON e.academic_year_id = ay.id
      JOIN groups g ON e.group_id = g.id
      LEFT JOIN teachers t ON g.teacher_id = t.id
      WHERE e.student_id = ?
      ORDER BY ay.start_date DESC, e.enrolled_at DESC
    `, [id]);

    // 2. All Group Transfers Log
    const [transfers] = await pool.query(`
      SELECT 
        tl.*,
        ay.label AS academic_year_label,
        fg.name AS from_group_name,
        fg.track_type AS from_track_type,
        tg.name AS to_group_name,
        tg.track_type AS to_track_type
      FROM transfers_log tl
      JOIN academic_years ay ON tl.academic_year_id = ay.id
      JOIN groups fg ON tl.from_group_id = fg.id
      JOIN groups tg ON tl.to_group_id = tg.id
      WHERE tl.student_id = ?
      ORDER BY tl.transfer_date DESC
    `, [id]);

    // 3. Tahfiz Progression (Quranic Memorization & Revision)
    const [tahfizLogs] = await pool.query(`
      SELECT 
        tl.*,
        e.group_id,
        g.name AS group_name,
        ay.label AS academic_year_label
      FROM tahfiz_logs tl
      JOIN enrollments e ON tl.enrollment_id = e.id
      JOIN groups g ON e.group_id = g.id
      JOIN academic_years ay ON e.academic_year_id = ay.id
      WHERE e.student_id = ?
      ORDER BY tl.date DESC
    `, [id]);

    // Max memorized hizb calculation
    let maxMemorizedHizb = 0;
    tahfizLogs.forEach(log => {
      if (log.type === 'MEMORIZATION' && log.hizb_to > maxMemorizedHizb) {
        maxMemorizedHizb = parseFloat(log.hizb_to);
      }
    });

    // 4. PreSchool Logs
    const [preschoolLogs] = await pool.query(`
      SELECT 
        pl.*,
        e.group_id,
        g.name AS group_name,
        ay.label AS academic_year_label
      FROM preschool_logs pl
      JOIN enrollments e ON pl.enrollment_id = e.id
      JOIN groups g ON e.group_id = g.id
      JOIN academic_years ay ON e.academic_year_id = ay.id
      WHERE e.student_id = ?
      ORDER BY pl.date DESC
    `, [id]);

    // 5. Tutoring Grades
    const [tutoringGrades] = await pool.query(`
      SELECT 
        tg.*,
        e.group_id,
        g.name AS group_name,
        g.subject_name,
        ay.label AS academic_year_label
      FROM tutoring_grades tg
      JOIN enrollments e ON tg.enrollment_id = e.id
      JOIN groups g ON e.group_id = g.id
      JOIN academic_years ay ON e.academic_year_id = ay.id
      WHERE e.student_id = ?
      ORDER BY tg.exam_date DESC
    `, [id]);

    // 6. Attendance Summary & Detailed Logs
    const [attendanceRows] = await pool.query(`
      SELECT 
        a.status,
        ay.id AS academic_year_id,
        ay.label AS academic_year_label
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      JOIN academic_years ay ON e.academic_year_id = ay.id
      WHERE e.student_id = ?
    `, [id]);

    // Calculate attendance percentage per academic year
    const attendanceStats = {};
    attendanceRows.forEach(row => {
      if (!attendanceStats[row.academic_year_label]) {
        attendanceStats[row.academic_year_label] = { total: 0, present: 0, late: 0, excused: 0, unexcused: 0 };
      }
      attendanceStats[row.academic_year_label].total++;
      if (row.status === 'PRESENT') attendanceStats[row.academic_year_label].present++;
      if (row.status === 'LATE') attendanceStats[row.academic_year_label].late++;
      if (row.status === 'EXCUSED') attendanceStats[row.academic_year_label].excused++;
      if (row.status === 'UNEXCUSED') attendanceStats[row.academic_year_label].unexcused++;
    });

    const yearlyAttendanceRates = Object.entries(attendanceStats).map(([yearLabel, stats]) => {
      const percentage = stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 100;
      return { yearLabel, ...stats, percentage };
    });

    // 7. Complete Financial Statement (Payments & Exemption Vouchers)
    const [payments] = await pool.query(`
      SELECT 
        p.*,
        ay.label AS academic_year_label,
        g.name AS group_name
      FROM payments p
      JOIN academic_years ay ON p.academic_year_id = ay.id
      JOIN groups g ON p.group_id = g.id
      WHERE p.student_id = ?
      ORDER BY p.payment_date DESC
    `, [id]);

    let totalPaid = 0;
    let totalExemptedVouchers = 0;
    payments.forEach(p => {
      if (p.payment_status === 'PAID') {
        totalPaid += parseFloat(p.amount);
      } else if (p.payment_status === 'EXEMPTED') {
        totalExemptedVouchers++;
      }
    });

    // 7.1 Product Purchases and Debts
    const [productSales] = await pool.query(`
      SELECT 
        ps.*,
        p.designation AS product_name,
        p.prix_achat AS product_cost,
        s.full_name AS student_name,
        s.reg_no AS student_reg_no,
        s.reg_no
      FROM product_sales ps
      JOIN products p ON ps.product_id = p.id
      JOIN students s ON ps.student_id = s.id
      WHERE ps.student_id = ?
      ORDER BY ps.sale_date DESC, ps.id DESC
    `, [id]);

    let totalProductPurchasesAmount = 0;
    let totalProductPaid = 0;
    let productDebt = 0;

    productSales.forEach(ps => {
      totalProductPurchasesAmount += parseFloat(ps.total_amount || 0);
      totalProductPaid += parseFloat(ps.paid_amount || 0);
      productDebt += parseFloat(ps.remaining_debt || 0);
    });

    // Calculate current month's unpaid dues for active enrollments
    const currentMonthRef = new Date().toISOString().slice(0, 7);
    let tuitionDebt = 0;
    const unpaidEnrollments = [];

    for (const en of enrollments) {
      if (en.status === 'ACTIVE' && en.is_free !== 1 && en.discount_type !== 'FULL_EXEMPTION') {
        const hasPaidCurrentMonth = payments.some(
          p => p.group_id === en.group_id && p.month_ref === currentMonthRef
        );
        if (!hasPaidCurrentMonth) {
          let fee = parseFloat(en.monthly_fee || 0);
          if (en.discount_type === 'PERCENTAGE') {
            fee -= (fee * parseFloat(en.discount_value || 0) / 100);
          } else if (en.discount_type === 'FIXED_AMOUNT') {
            fee = Math.max(0, fee - parseFloat(en.discount_value || 0));
          }
          if (fee > 0) {
            tuitionDebt += fee;
            unpaidEnrollments.push({
              group_id: en.group_id,
              group_name: en.group_name,
              monthly_fee: fee,
              month_ref: currentMonthRef
            });
          }
        }
      }
    }

    const currentTotalDebt = tuitionDebt + productDebt;

    // 8. Build Unified Multi-Year Timeline Events
    // Combine enrollments, transfers, evaluations, awards, product purchases into a unified timeline array sorted chronologically
    const timeline = [];

    enrollments.forEach(en => {
      // If this enrollment was created as the destination of an official transfer,
      // it is already documented by the TRANSFER_EVENT below.
      // Only include independent/initial enrollments (not originating from a transfer).
      const isDestinationOfTransfer = transfers.some(tr => 
        Number(tr.to_group_id) === Number(en.group_id) && 
        Number(tr.academic_year_id) === Number(en.academic_year_id)
      );

      if (!isDestinationOfTransfer) {
        timeline.push({
          id: `en-${en.id}`,
          type: 'ENROLLMENT',
          date: en.created_at || en.enrolled_at,
          year: en.academic_year_label,
          title: `التحاق بـ ${en.group_name}`,
          subtitle: `المسار: ${en.track_type === 'HALAQA' ? 'قرآني' : en.track_type === 'PRESCHOOL' ? 'تحضيري' : 'دعم مدرسي'} | الأستاذ: ${en.teacher_name || 'غير محدد'}`,
          status: en.status,
          badgeColor: en.track_type === 'HALAQA' ? 'emerald' : en.track_type === 'PRESCHOOL' ? 'purple' : 'blue',
          details: en.discount_type === 'FULL_EXEMPTION' ? 'منحة إعفاء كامل 100%' : en.discount_type !== 'NONE' ? `خصم: ${en.discount_value}` : 'تسجيل قياسي'
        });
      }

      // Only push a standalone TRANSFER_OUT if this transfer is NOT recorded in transfers_log (fallback for legacy data)
      const isLoggedTransfer = transfers.some(tr => 
        Number(tr.from_group_id) === Number(en.group_id) && 
        Number(tr.academic_year_id) === Number(en.academic_year_id)
      );

      if (en.status === 'TRANSFERRED' && en.ended_at && !isLoggedTransfer) {
        timeline.push({
          id: `en-trans-${en.id}`,
          type: 'TRANSFER_OUT',
          date: en.created_at || en.ended_at,
          year: en.academic_year_label,
          title: `انتقال من فوج: ${en.group_name}`,
          subtitle: `سبب الانتقال: ${en.transfer_reason || 'تغيير الجدول / ترقية المستوى'}`,
          status: 'TRANSFERRED',
          badgeColor: 'amber'
        });
      }
    });

    transfers.forEach(tr => {
      timeline.push({
        id: `tr-${tr.id}`,
        type: 'TRANSFER_EVENT',
        date: tr.transfer_date,
        year: tr.academic_year_label,
        title: `تحويل رسمي: من [${tr.from_group_name}] إلى [${tr.to_group_name}]`,
        subtitle: tr.reason,
        status: 'OFFICIAL_TRANSFER',
        badgeColor: 'amber',
        details: `المسؤول: ${tr.created_by}`
      });
    });

    tahfizLogs.forEach(th => {
      timeline.push({
        id: `th-${th.id}`,
        type: 'TAHFIZ_EVALUATION',
        date: th.created_at || th.date,
        year: th.academic_year_label,
        title: `${th.type === 'MEMORIZATION' ? 'حفظ جديد' : 'مراجعة وتثبيت'}: من ${th.surah_from} إلى ${th.surah_to}`,
        subtitle: `نطاق الأحزاب: ${th.hizb_from || '-'} إلى ${th.hizb_to || '-'} | التقدير: ${th.grade}`,
        grade: th.grade,
        notes: th.notes,
        badgeColor: 'emerald'
      });
    });

    preschoolLogs.forEach(ps => {
      timeline.push({
        id: `ps-${ps.id}`,
        type: 'PRESCHOOL_EVALUATION',
        date: ps.created_at || ps.date,
        year: ps.academic_year_label,
        title: `تقييم مهارة: ${ps.activity_title || ps.skill_category}`,
        subtitle: `التصنيف: ${ps.skill_category} | التقدير: ${ps.score_rating}`,
        rating: ps.score_rating,
        notes: ps.behavior_note,
        badgeColor: 'purple'
      });
    });

    tutoringGrades.forEach(tg => {
      timeline.push({
        id: `tg-${tg.id}`,
        type: 'TUTORING_GRADE',
        date: tg.created_at || tg.exam_date,
        year: tg.academic_year_label,
        title: `اختبار دعم: ${tg.exam_title}`,
        subtitle: `العلامة المحصل عليها: ${tg.score} / ${tg.max_score}`,
        score: tg.score,
        notes: tg.teacher_notes,
        badgeColor: 'blue'
      });
    });

    // Sort timeline descending by date (newest first, with logical tie-breaker for same-day actions)
    timeline.sort((a, b) => {
      const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (timeDiff !== 0) return timeDiff;
      const typePriority = {
        'TUTORING_GRADE': 5,
        'PRESCHOOL_EVALUATION': 5,
        'TAHFIZ_EVALUATION': 5,
        'TRANSFER_EVENT': 4,
        'TRANSFER_OUT': 3,
        'ENROLLMENT': 1
      };
      return (typePriority[b.type] || 0) - (typePriority[a.type] || 0);
    });

    // Product Purchases Timeline Events
    productSales.forEach(ps => {
      const isPaid = ps.status === 'PAID';
      const isPartial = ps.status === 'PARTIAL';
      timeline.push({
        id: `sale-${ps.id}`,
        type: 'PRODUCT_PURCHASE',
        date: ps.sale_date,
        year: ps.academic_year_label || '',
        title: `شراء منتج: ${ps.product_name} (${ps.quantity} قطعة)`,
        subtitle: `المبلغ: ${parseFloat(ps.total_amount).toLocaleString()} دج | المدفوع: ${parseFloat(ps.paid_amount).toLocaleString()} دج | المتبقي: ${parseFloat(ps.remaining_debt).toLocaleString()} دج`,
        status: ps.status,
        badgeColor: isPaid ? 'emerald' : isPartial ? 'amber' : 'rose',
        details: `وصل رقم: ${ps.receipt_no} ${ps.notes ? `| ${ps.notes}` : ''}`,
        saleData: ps
      });
    });

    return res.json({
      success: true,
      data: {
        student,
        summary: {
          totalEnrollments: enrollments.length,
          totalTransfers: transfers.length,
          maxMemorizedHizb,
          totalTahfizSessions: tahfizLogs.length,
          totalTutoringExams: tutoringGrades.length,
          totalPreschoolEvaluations: preschoolLogs.length,
          totalPaid,
          totalProductPurchasesAmount,
          totalProductPaid,
          overallTotalPaid: totalPaid + totalProductPaid,
          totalExemptedVouchers,
          tuitionDebt,
          productDebt,
          currentDebt: currentTotalDebt,
          unpaidEnrollments,
          unpaidProductSales: productSales.filter(ps => parseFloat(ps.remaining_debt || 0) > 0)
        },
        enrollments,
        transfers,
        tahfizLogs,
        preschoolLogs,
        tutoringGrades,
        yearlyAttendanceRates,
        payments,
        productSales,
        timeline
      }
    });

  } catch (error) {
    console.error('getStudentLifetimeDossier error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// Recalculate debt and financial status for all students in the active academic year
export const recalculateAllDebts = async (req, res) => {
  try {
    const { academic_year_id } = req.body || req.query;

    // Get current month reference e.g. "2026-09"
    const currentMonthRef = new Date().toISOString().slice(0, 7);

    // Fetch active enrollments with group fees
    let enrollQuery = `
      SELECT 
        e.id AS enrollment_id,
        e.student_id,
        e.group_id,
        e.academic_year_id,
        e.discount_type,
        e.discount_value,
        g.is_free,
        g.monthly_fee
      FROM enrollments e
      JOIN groups g ON e.group_id = g.id
      WHERE e.status = 'ACTIVE'
    `;
    const params = [];
    if (academic_year_id) {
      enrollQuery += ` AND e.academic_year_id = ?`;
      params.push(academic_year_id);
    }

    const [enrollments] = await pool.query(enrollQuery, params);

    // Fetch current month payments
    const [payments] = await pool.query(
      `SELECT student_id, group_id, payment_status, amount FROM payments WHERE month_ref = ?`,
      [currentMonthRef]
    );

    let totalStudentsWithDebt = 0;
    let totalDebtAmount = 0;
    const studentDebtMap = new Map();

    for (const en of enrollments) {
      if (en.is_free === 1 || en.discount_type === 'FULL_EXEMPTION') continue;

      const hasPaid = payments.some(
        p => p.student_id === en.student_id && p.group_id === en.group_id
      );

      if (!hasPaid) {
        let fee = parseFloat(en.monthly_fee || 0);
        if (en.discount_type === 'PERCENTAGE') {
          fee -= (fee * parseFloat(en.discount_value || 0) / 100);
        } else if (en.discount_type === 'FIXED_AMOUNT') {
          fee = Math.max(0, fee - parseFloat(en.discount_value || 0));
        }

        if (fee > 0) {
          const prevDebt = studentDebtMap.get(en.student_id) || 0;
          studentDebtMap.set(en.student_id, prevDebt + fee);
          totalDebtAmount += fee;
        }
      }
    }

    // Also include product sales debt in recalculateAllDebts
    const [productDebts] = await pool.query(`
      SELECT student_id, SUM(remaining_debt) AS total_debt
      FROM product_sales
      WHERE remaining_debt > 0
      GROUP BY student_id
    `);
    productDebts.forEach(pd => {
      const prevDebt = studentDebtMap.get(pd.student_id) || 0;
      const pDebt = parseFloat(pd.total_debt || 0);
      studentDebtMap.set(pd.student_id, prevDebt + pDebt);
      totalDebtAmount += pDebt;
    });

    totalStudentsWithDebt = studentDebtMap.size;

    return res.json({
      success: true,
      message: req.t('recalculate_debt_success') || 'تمت إعادة حساب الديون بنجاح',
      data: {
        currentMonthRef,
        totalStudentsEvaluated: enrollments.length,
        totalStudentsWithDebt,
        totalDebtAmount
      }
    });
  } catch (error) {
    console.error('recalculateAllDebts error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};
