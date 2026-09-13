import pool from '../config/db.js';
import { logActivity } from '../utils/auditLogger.js';
import { getGroupGenderPolicy } from './settingsController.js';

export const getGroups = async (req, res) => {
  try {
    const { academic_year_id, track_type, search, status, gender } = req.query;
    const policy = await getGroupGenderPolicy();

    let query = `
      SELECT 
        g.*,
        ay.label AS academic_year_label,
        t.full_name AS teacher_name,
        t.phone AS teacher_phone,
        t.specialty AS teacher_specialty,
        t.photo_url AS teacher_photo_url,
        (SELECT COUNT(*) FROM enrollments e WHERE e.group_id = g.id AND e.status = 'ACTIVE') AS active_students_count
      FROM groups g
      JOIN academic_years ay ON g.academic_year_id = ay.id
      LEFT JOIN teachers t ON g.teacher_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (academic_year_id) {
      query += ` AND g.academic_year_id = ?`;
      params.push(academic_year_id);
    }

    if (track_type) {
      query += ` AND g.track_type = ?`;
      params.push(track_type);
    }

    if (status) {
      query += ` AND g.status = ?`;
      params.push(status);
    }

    if (gender) {
      query += ` AND g.gender = ?`;
      params.push(gender);
    }

    if (search) {
      query += ` AND (g.name LIKE ? OR g.subject_name LIKE ? OR t.full_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Filter by gender_access when gender separation is enabled
    if (policy === 'SEPARATED' && req.user?.gender_access && req.user.gender_access !== 'ALL') {
      query += ` AND (g.gender = ? OR g.gender = 'ALL' OR g.gender IS NULL)`;
      params.push(req.user.gender_access);
    }

    query += ` ORDER BY g.track_type ASC, g.name ASC`;

    const [groups] = await pool.query(query, params);
    return res.json({ success: true, data: groups });
  } catch (error) {
    console.error('getGroups error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const policy = await getGroupGenderPolicy();

    const [groups] = await pool.query(`
      SELECT 
        g.*,
        ay.label AS academic_year_label,
        ay.is_locked AS is_year_locked,
        t.full_name AS teacher_name,
        t.phone AS teacher_phone,
        t.specialty AS teacher_specialty,
        t.photo_url AS teacher_photo_url
      FROM groups g
      JOIN academic_years ay ON g.academic_year_id = ay.id
      LEFT JOIN teachers t ON g.teacher_id = t.id
      WHERE g.id = ?
    `, [id]);

    if (groups.length === 0) {
      return res.status(404).json({ success: false, message: req.t('group_not_found') });
    }

    const group = groups[0];

    // Accessibility check if policy is SEPARATED
    if (policy === 'SEPARATED' && req.user?.gender_access && req.user.gender_access !== 'ALL') {
      if (group.gender && group.gender !== 'ALL' && group.gender !== req.user.gender_access) {
        return res.status(403).json({
          success: false,
          message: req.t('forbidden_gender_access') || 'ليس لديك صلاحية للوصول إلى هذا الفوج'
        });
      }
    }
    const targetMonthRef = req.query.month_ref || new Date().toISOString().slice(0, 7);

    // Get active and transferred enrollments for this group
    const [students] = await pool.query(`
      SELECT 
        e.id AS enrollment_id,
        e.student_id,
        e.enrolled_at,
        e.ended_at,
        e.status AS enrollment_status,
        e.discount_type,
        e.discount_value,
        e.transfer_reason,
        s.reg_no,
        s.full_name AS student_name,
        s.dob,
        s.gender,
        s.academic_level,
        s.guardian_name,
        s.guardian_phone,
        s.photo_url
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      WHERE e.group_id = ?
      ORDER BY e.status ASC, s.full_name ASC
    `, [id]);

    // Fetch payments for this group and target month
    const [payments] = await pool.query(`
      SELECT 
        student_id,
        COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN amount ELSE 0 END), 0) AS total_paid,
        MAX(CASE WHEN payment_status = 'EXEMPTED' THEN 1 ELSE 0 END) AS has_exemption,
        COUNT(id) AS payment_count,
        GROUP_CONCAT(receipt_no ORDER BY id DESC SEPARATOR ', ') AS receipt_numbers
      FROM payments
      WHERE group_id = ? AND academic_year_id = ? AND month_ref = ?
      GROUP BY student_id
    `, [group.id, group.academic_year_id, targetMonthRef]);

    // Fetch refunds for this group and target month
    const [refunds] = await pool.query(`
      SELECT 
        student_id,
        COALESCE(SUM(amount), 0) AS total_refunded,
        COUNT(id) AS refund_count,
        GROUP_CONCAT(receipt_no ORDER BY id DESC SEPARATOR ', ') AS refund_receipt_numbers
      FROM refunds
      WHERE group_id = ? AND academic_year_id = ? AND month_ref = ?
      GROUP BY student_id
    `, [group.id, group.academic_year_id, targetMonthRef]);

    const paymentMap = new Map();
    payments.forEach(p => {
      paymentMap.set(p.student_id, p);
    });

    const refundMap = new Map();
    refunds.forEach(r => {
      refundMap.set(r.student_id, r);
    });

    const isGroupFree = group.is_free === 1 || group.is_free === true || parseFloat(group.monthly_fee || 0) === 0;
    const monthlyFee = parseFloat(group.monthly_fee || 0);

    const studentsWithPayment = students.map(student => {
      const pData = paymentMap.get(student.student_id);
      const rData = refundMap.get(student.student_id);
      const grossPaidAmount = pData ? parseFloat(pData.total_paid || 0) : 0;
      const refundedAmount = rData ? parseFloat(rData.total_refunded || 0) : 0;
      const netPaidAmount = Math.max(0, grossPaidAmount - refundedAmount);
      const hasExemption = (pData && pData.has_exemption === 1) || student.discount_type === 'FULL_EXEMPTION';

      // Compute expected fee
      let expectedFee = monthlyFee;
      if (isGroupFree || student.discount_type === 'FULL_EXEMPTION') {
        expectedFee = 0;
      } else if (student.discount_type === 'PERCENTAGE') {
        const pct = parseFloat(student.discount_value || 0);
        expectedFee = Math.max(0, monthlyFee - (monthlyFee * pct / 100));
      } else if (student.discount_type === 'FIXED_AMOUNT') {
        const disc = parseFloat(student.discount_value || 0);
        expectedFee = Math.max(0, monthlyFee - disc);
      }
      expectedFee = Math.round(expectedFee * 100) / 100;

      let paymentStatus = 'UNPAID';
      if (isGroupFree) {
        paymentStatus = 'FREE';
      } else if (hasExemption) {
        paymentStatus = 'EXEMPTED';
      } else if (grossPaidAmount > 0 && netPaidAmount === 0 && refundedAmount > 0) {
        paymentStatus = 'REFUNDED';
      } else if (netPaidAmount >= expectedFee && expectedFee > 0) {
        paymentStatus = 'PAID_FULL';
      } else if (netPaidAmount > 0 && netPaidAmount < expectedFee) {
        paymentStatus = 'PAID_PARTIAL';
      } else if (expectedFee === 0) {
        paymentStatus = 'EXEMPTED';
      } else {
        paymentStatus = 'UNPAID';
      }

      const remainingAmount = Math.max(0, expectedFee - netPaidAmount);

      return {
        ...student,
        payment_info: {
          status: paymentStatus, // 'FREE' | 'EXEMPTED' | 'PAID_FULL' | 'PAID_PARTIAL' | 'UNPAID' | 'REFUNDED'
          expected_amount: expectedFee,
          paid_amount: netPaidAmount,
          gross_paid_amount: grossPaidAmount,
          refunded_amount: refundedAmount,
          remaining_amount: remainingAmount,
          month_ref: targetMonthRef,
          receipt_numbers: pData?.receipt_numbers || null,
          refund_receipt_numbers: rData?.refund_receipt_numbers || null,
          payment_count: pData?.payment_count || 0,
          refund_count: rData?.refund_count || 0
        }
      };
    });

    return res.json({
      success: true,
      data: {
        ...group,
        month_ref: targetMonthRef,
        students: studentsWithPayment
      }
    });
  } catch (error) {
    console.error('getGroupById error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// Helper to convert time "HH:mm" or "HH:mm:ss" to minutes
const toMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

// Check if any sessions overlap on the same day
const hasOverlappingSessions = (sessions) => {
  if (!Array.isArray(sessions) || sessions.length < 2) return false;
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const s1 = sessions[i];
      const s2 = sessions[j];
      if (s1.day_of_week && s2.day_of_week && s1.day_of_week === s2.day_of_week) {
        const start1 = toMinutes(s1.start_time);
        const end1 = toMinutes(s1.end_time);
        const start2 = toMinutes(s2.start_time);
        const end2 = toMinutes(s2.end_time);
        if (start1 !== null && end1 !== null && start2 !== null && end2 !== null) {
          if (start1 < end2 && start2 < end1) {
            return true;
          }
        }
      }
    }
  }
  return false;
};

export const createGroup = async (req, res) => {
  try {
    const {
      academic_year_id,
      name,
      track_type,
      subject_name,
      gender,
      teacher_id,
      room,
      schedule,
      is_free,
      monthly_fee,
      month_calculation_type,
      package_quota,
      sessions
    } = req.body;

    if (!academic_year_id || !name || !track_type) {
      return res.status(400).json({ success: false, message: req.t('bad_request') });
    }

    const policy = await getGroupGenderPolicy();
    let finalGender = gender;
    if (policy === 'SEPARATED') {
      if (!gender || !['MALE', 'FEMALE'].includes(gender)) {
        return res.status(400).json({
          success: false,
          message: req.t('group_gender_required') || 'يرجى تحديد جنس الفوج (ذكور أو إناث)'
        });
      }
      if (req.user?.gender_access && req.user.gender_access !== 'ALL' && req.user.gender_access !== gender) {
        return res.status(403).json({
          success: false,
          message: req.t('forbidden_gender_access') || 'غير مصرح لك بإنشاء فوج لهذا الجنس'
        });
      }
    } else {
      finalGender = gender && ['MALE', 'FEMALE'].includes(gender) ? gender : 'ALL';
    }

    if (track_type === 'TUTORING' && hasOverlappingSessions(sessions)) {
      return res.status(400).json({
        success: false,
        message: req.t('schedule_overlap_error') || 'لا يمكن برمجة حصتين في نفس اليوم والتوقيت أو متداخلتين'
      });
    }

    const fee = is_free ? 0.00 : (monthly_fee || 0.00);
    const validCalcTypes = ['CALENDAR_MONTH', 'PER_SESSION', 'PER_HOUR'];
    const finalCalcType = validCalcTypes.includes(month_calculation_type) ? month_calculation_type : 'CALENDAR_MONTH';
    const finalQuota = (finalCalcType !== 'CALENDAR_MONTH' && package_quota) ? parseInt(package_quota, 10) : null;

    const [result] = await pool.query(`
      INSERT INTO groups (academic_year_id, name, track_type, subject_name, gender, teacher_id, room, schedule, is_free, monthly_fee, month_calculation_type, package_quota, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `, [
      academic_year_id,
      name,
      track_type,
      subject_name || null,
      finalGender,
      teacher_id || null,
      room || null,
      schedule || null,
      is_free ? 1 : 0,
      fee,
      finalCalcType,
      finalQuota
    ]);

    const newGroupId = result.insertId;

    // If structured sessions provided, optionally populate timetable_sessions
    if (Array.isArray(sessions) && sessions.length > 0) {
      try {
        let classroomId = null;
        if (room) {
          const [rooms] = await pool.query('SELECT id FROM classrooms WHERE name = ?', [room]);
          if (rooms.length > 0) classroomId = rooms[0].id;
        }

        for (const s of sessions) {
          if (s.day_of_week && s.start_time && s.end_time) {
            const startVal = s.start_time.length === 5 ? `${s.start_time}:00` : s.start_time;
            const endVal = s.end_time.length === 5 ? `${s.end_time}:00` : s.end_time;
            await pool.query(`
              INSERT INTO timetable_sessions (academic_year_id, group_id, classroom_id, teacher_id, day_of_week, start_time, end_time)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              academic_year_id,
              newGroupId,
              classroomId,
              teacher_id || null,
              s.day_of_week,
              startVal,
              endVal
            ]);
          }
        }
      } catch (sessErr) {
        console.error('Failed to auto-create timetable_sessions from group creation:', sessErr);
      }
    }

    logActivity(req, {
      action_type: 'CREATE',
      data_type: 'GROUP',
      entity_id: newGroupId,
      entity_name: name,
      details: `إنشاء فوج جديد: "${name}" (${track_type}) [الجنس: ${finalGender}] - الاشتراك: ${is_free ? 'مجاني' : fee + ' دج'}`
    });

    return res.status(201).json({
      success: true,
      message: req.t('group_created_success'),
      data: { id: newGroupId, ...req.body, gender: finalGender }
    });
  } catch (error) {
    console.error('createGroup error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM groups WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: req.t('group_not_found') });
    }
    const current = existing[0];

    const {
      name = current.name,
      track_type = current.track_type,
      subject_name = current.subject_name,
      gender,
      teacher_id,
      room = current.room,
      schedule = current.schedule,
      is_free,
      monthly_fee,
      month_calculation_type,
      package_quota,
      status,
      sessions
    } = req.body;

    const policy = await getGroupGenderPolicy();
    let finalGender = gender !== undefined ? gender : current.gender;
    if (policy === 'SEPARATED') {
      if (!finalGender || !['MALE', 'FEMALE'].includes(finalGender)) {
        return res.status(400).json({
          success: false,
          message: req.t('group_gender_required') || 'يرجى تحديد جنس الفوج (ذكور أو إناث)'
        });
      }
      if (req.user?.gender_access && req.user.gender_access !== 'ALL' && req.user.gender_access !== finalGender) {
        return res.status(403).json({
          success: false,
          message: req.t('forbidden_gender_access') || 'غير مصرح لك بتعديل فوج لهذا الجنس'
        });
      }
    } else {
      finalGender = finalGender && ['MALE', 'FEMALE'].includes(finalGender) ? finalGender : (current.gender || 'ALL');
    }

    if (track_type === 'TUTORING' && hasOverlappingSessions(sessions)) {
      return res.status(400).json({
        success: false,
        message: req.t('schedule_overlap_error') || 'لا يمكن برمجة حصتين في نفس اليوم والتوقيت أو متداخلتين'
      });
    }

    const finalIsFree = is_free !== undefined ? (is_free ? 1 : 0) : current.is_free;
    const finalMonthlyFee = finalIsFree ? 0.00 : (monthly_fee !== undefined ? (parseFloat(monthly_fee) || 0.00) : current.monthly_fee);
    const finalTeacherId = teacher_id !== undefined ? (teacher_id ? parseInt(teacher_id, 10) : null) : current.teacher_id;
    const validStatuses = ['PENDING', 'ACTIVE', 'STOPPED', 'ARCHIVED'];
    const finalStatus = (status && validStatuses.includes(status)) ? status : current.status;

    const validCalcTypes = ['CALENDAR_MONTH', 'PER_SESSION', 'PER_HOUR'];
    const finalCalcType = (month_calculation_type && validCalcTypes.includes(month_calculation_type))
      ? month_calculation_type 
      : (current.month_calculation_type || 'CALENDAR_MONTH');
    const finalQuota = package_quota !== undefined 
      ? (package_quota ? parseInt(package_quota, 10) : null) 
      : current.package_quota;

    await pool.query(`
      UPDATE groups 
      SET name = ?, track_type = ?, subject_name = ?, gender = ?, teacher_id = ?, room = ?, schedule = ?, is_free = ?, monthly_fee = ?, month_calculation_type = ?, package_quota = ?, status = ?
      WHERE id = ?
    `, [
      name,
      track_type,
      subject_name || null,
      finalGender,
      finalTeacherId,
      room || null,
      schedule || null,
      finalIsFree,
      finalMonthlyFee,
      finalCalcType,
      finalQuota,
      finalStatus,
      id
    ]);

    // If sessions array explicitly provided, sync timetable_sessions
    if (Array.isArray(sessions)) {
      try {
        let classroomId = null;
        const targetRoom = room !== undefined ? room : current.room;
        if (targetRoom) {
          const [rooms] = await pool.query('SELECT id FROM classrooms WHERE name = ?', [targetRoom]);
          if (rooms.length > 0) classroomId = rooms[0].id;
        }

        // Delete old sessions for this group and re-insert
        await pool.query('DELETE FROM timetable_sessions WHERE group_id = ?', [id]);

        for (const s of sessions) {
          if (s.day_of_week && s.start_time && s.end_time) {
            const startVal = s.start_time.length === 5 ? `${s.start_time}:00` : s.start_time;
            const endVal = s.end_time.length === 5 ? `${s.end_time}:00` : s.end_time;
            await pool.query(`
              INSERT INTO timetable_sessions (academic_year_id, group_id, classroom_id, teacher_id, day_of_week, start_time, end_time, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              current.academic_year_id,
              id,
              classroomId,
              finalTeacherId,
              s.day_of_week,
              startVal,
              endVal,
              track_type === 'PRESCHOOL' ? 'دوام تحضيري يومي' : (subject_name || 'حصة أسبوعية')
            ]);
          }
        }
      } catch (ttErr) {
        console.warn('Auto timetable sync on updateGroup non-fatal error:', ttErr.message);
      }
    }

    logActivity(req, {
      action_type: 'UPDATE',
      data_type: 'GROUP',
      entity_id: id,
      entity_name: name,
      details: `تعديل بيانات الفوج: "${name}" (${track_type})`
    });

    return res.json({ success: true, message: req.t('group_updated_success') });
  } catch (error) {
    console.error('updateGroup error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const changeGroupStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'ACTIVE', 'STOPPED', 'ARCHIVED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: req.t('bad_request')
      });
    }

    const [existing] = await pool.query('SELECT id, name, status FROM groups WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: req.t('group_not_found') });
    }

    const currentStatus = existing[0].status;

    if (currentStatus === 'ACTIVE' && status === 'ARCHIVED') {
      return res.status(400).json({
        success: false,
        message: req.t('bad_request')
      });
    }

    await pool.query('UPDATE groups SET status = ? WHERE id = ?', [status, id]);

    logActivity(req, {
      action_type: 'UPDATE',
      data_type: 'GROUP',
      entity_id: id,
      entity_name: existing[0].name,
      details: `تغيير حالة الفوج "${existing[0].name}" من ${currentStatus} إلى ${status}`
    });

    return res.json({
      success: true,
      message: req.t('group_status_updated_success'),
      previousStatus: currentStatus,
      newStatus: status
    });
  } catch (error) {
    console.error('changeGroupStatus error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT name FROM groups WHERE id = ?', [id]);
    await pool.query('DELETE FROM groups WHERE id = ?', [id]);

    logActivity(req, {
      action_type: 'DELETE',
      data_type: 'GROUP',
      entity_id: id,
      entity_name: existing?.[0]?.name || id,
      details: `حذف الفوج: "${existing?.[0]?.name || id}"`
    });

    return res.json({ success: true, message: req.t('success') });
  } catch (error) {
    console.error('deleteGroup error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// Direct enrollment into group
export const enrollStudentInGroup = async (req, res) => {
  try {
    const { id: group_id } = req.params;
    const { student_id, discount_type = 'NONE', discount_value = 0.00 } = req.body;

    if (!student_id) {
      return res.status(400).json({ success: false, message: req.t('bad_request') });
    }

    const [groupRows] = await pool.query('SELECT academic_year_id, gender, name FROM groups WHERE id = ?', [group_id]);
    if (groupRows.length === 0) {
      return res.status(404).json({ success: false, message: req.t('group_not_found') });
    }
    const targetGroup = groupRows[0];
    const academic_year_id = targetGroup.academic_year_id;

    // Fetch student info
    const [studentRows] = await pool.query('SELECT id, gender, full_name FROM students WHERE id = ?', [student_id]);
    if (studentRows.length === 0) {
      return res.status(404).json({ success: false, message: req.t('student_not_found') });
    }
    const targetStudent = studentRows[0];

    // Check gender policy & matching
    const policy = await getGroupGenderPolicy();
    if (policy === 'SEPARATED') {
      if (targetGroup.gender && targetGroup.gender !== 'ALL') {
        if (targetStudent.gender !== targetGroup.gender) {
          return res.status(400).json({
            success: false,
            message: req.t('student_gender_mismatch_group') || 'لا يمكن تسجيل طالب في فوج مخصص للجنس الآخر (يجب تطابق الجنس)'
          });
        }
      }
      if (req.user?.gender_access && req.user.gender_access !== 'ALL' && req.user.gender_access !== targetStudent.gender) {
        return res.status(403).json({
          success: false,
          message: req.t('forbidden_gender_access') || 'غير مصرح لك بإدارة هذا الطالب'
        });
      }
    }

    // Check existing active enrollment
    const [existing] = await pool.query(`
      SELECT id FROM enrollments 
      WHERE academic_year_id = ? AND student_id = ? AND group_id = ? AND status = 'ACTIVE'
    `, [academic_year_id, student_id, group_id]);

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: req.t('student_already_enrolled') });
    }

    const today = new Date().toISOString().split('T')[0];

    const [result] = await pool.query(`
      INSERT INTO enrollments (academic_year_id, student_id, group_id, enrolled_at, status, discount_type, discount_value)
      VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
    `, [academic_year_id, student_id, group_id, today, discount_type, discount_value]);

    logActivity(req, {
      action_type: 'ENROLL',
      data_type: 'ENROLLMENT',
      entity_id: result.insertId,
      entity_name: targetStudent.full_name,
      details: `تسجيل الطالب "${targetStudent.full_name}" في الفوج "${targetGroup.name}"`
    });

    return res.status(201).json({
      success: true,
      message: req.t('student_enrolled_success'),
      enrollmentId: result.insertId
    });
  } catch (error) {
    console.error('enrollStudentInGroup error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const stopGroupEnrollment = async (req, res) => {
  try {
    const { id, enrollmentId } = req.params;
    const { notes } = req.body || {};

    const [enrollments] = await pool.query(`
      SELECT e.*, s.full_name AS student_name, g.name AS group_name
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN groups g ON e.group_id = g.id
      WHERE e.id = ? AND e.group_id = ?
    `, [enrollmentId, id]);

    if (enrollments.length === 0) {
      return res.status(404).json({ success: false, message: req.t('enrollment_not_found', 'التسجيل غير موجود') });
    }

    const enrollment = enrollments[0];
    if (enrollment.status === 'DROPPED') {
      return res.status(400).json({ success: false, message: req.t('student_already_stopped', 'الطالب متوقف بالفعل عن هذا الفوج') });
    }

    const today = new Date().toISOString().split('T')[0];

    await pool.query(`
      UPDATE enrollments 
      SET status = 'DROPPED', ended_at = ?
      WHERE id = ?
    `, [today, enrollmentId]);

    logActivity(req, {
      action_type: 'STOP',
      data_type: 'ENROLLMENT',
      entity_id: enrollmentId,
      entity_name: enrollment.student_name,
      details: `إيقاف الطالب "${enrollment.student_name}" من الفوج "${enrollment.group_name}" بتاريخ ${today}${notes ? ` - ملاحظات: ${notes}` : ''}`
    });

    return res.json({
      success: true,
      message: req.t('student_stopped_success', 'تم إيقاف الطالب عن الفوج بنجاح'),
      data: {
        enrollment_id: enrollmentId,
        status: 'DROPPED',
        ended_at: today
      }
    });
  } catch (error) {
    console.error('stopGroupEnrollment error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const resumeGroupEnrollment = async (req, res) => {
  try {
    const { id, enrollmentId } = req.params;

    const [enrollments] = await pool.query(`
      SELECT e.*, s.full_name AS student_name, g.name AS group_name
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN groups g ON e.group_id = g.id
      WHERE e.id = ? AND e.group_id = ?
    `, [enrollmentId, id]);

    if (enrollments.length === 0) {
      return res.status(404).json({ success: false, message: req.t('enrollment_not_found', 'التسجيل غير موجود') });
    }

    const enrollment = enrollments[0];
    if (enrollment.status === 'ACTIVE') {
      return res.status(400).json({ success: false, message: req.t('student_already_active', 'الطالب نشط ومسجل بالفعل في هذا الفوج') });
    }

    await pool.query(`
      UPDATE enrollments 
      SET status = 'ACTIVE', ended_at = NULL
      WHERE id = ?
    `, [enrollmentId]);

    logActivity(req, {
      action_type: 'RESUME',
      data_type: 'ENROLLMENT',
      entity_id: enrollmentId,
      entity_name: enrollment.student_name,
      details: `استئناف دراسة الطالب "${enrollment.student_name}" في الفوج "${enrollment.group_name}"`
    });

    return res.json({
      success: true,
      message: req.t('student_resumed_success', 'تم استئناف دراسة الطالب في الفوج بنجاح'),
      data: {
        enrollment_id: enrollmentId,
        status: 'ACTIVE',
        ended_at: null
      }
    });
  } catch (error) {
    console.error('resumeGroupEnrollment error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

