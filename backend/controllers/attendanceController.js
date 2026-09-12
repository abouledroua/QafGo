import pool from '../config/db.js';
import { logActivity } from '../utils/auditLogger.js';

export const getGroupAttendanceByDate = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { date } = req.query;

    const selectedDate = date || new Date().toISOString().split('T')[0];

    const [rows] = await pool.query(`
      SELECT 
        e.id AS enrollment_id,
        s.id AS student_id,
        s.full_name AS student_name,
        s.reg_no,
        a.id AS attendance_id,
        COALESCE(a.status, 'PRESENT') AS status,
        a.notes
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      LEFT JOIN attendance a ON a.enrollment_id = e.id AND a.date = ?
      WHERE e.group_id = ? AND e.status = 'ACTIVE'
      ORDER BY s.full_name ASC
    `, [selectedDate, groupId]);

    return res.json({ success: true, date: selectedDate, data: rows });
  } catch (error) {
    console.error('getGroupAttendanceByDate error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const saveBulkAttendance = async (req, res) => {
  const { date, records } = req.body; // records: [{ enrollment_id, status, notes }]

  if (!date || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, message: req.t('bad_request') });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const record of records) {
      const { enrollment_id, status = 'PRESENT', notes = '' } = record;

      // Check if attendance already exists for this enrollment & date
      const [existing] = await connection.query(`
        SELECT id FROM attendance WHERE enrollment_id = ? AND date = ?
      `, [enrollment_id, date]);

      if (existing.length > 0) {
        await connection.query(`
          UPDATE attendance SET status = ?, notes = ? WHERE id = ?
        `, [status, notes, existing[0].id]);
      } else {
        await connection.query(`
          INSERT INTO attendance (enrollment_id, date, status, notes)
          VALUES (?, ?, ?, ?)
        `, [enrollment_id, date, status, notes]);
      }
    }

    await connection.commit();

    logActivity(req, {
      action_type: 'ATTENDANCE',
      data_type: 'ATTENDANCE',
      details: `تسجيل حضور وغياب الطلبة ليوم ${date} (${records.length} طالب)`
    });

    return res.json({ success: true, message: req.t('attendance_saved_success') });
  } catch (error) {
    await connection.rollback();
    console.error('saveBulkAttendance error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  } finally {
    connection.release();
  }
};

// ==================== TEACHER ATTENDANCE & SUBSTITUTION ====================

// 1. Get teacher attendance for a specific group and date
export const getGroupTeacherAttendance = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { date } = req.query;

    const selectedDate = date || new Date().toISOString().split('T')[0];

    // First fetch group and primary teacher
    const [groupRows] = await pool.query(`
      SELECT g.id, g.name, g.teacher_id, t.full_name AS teacher_name, t.photo_url AS teacher_photo, t.phone AS teacher_phone
      FROM groups g
      LEFT JOIN teachers t ON g.teacher_id = t.id
      WHERE g.id = ?
    `, [groupId]);

    if (groupRows.length === 0) {
      return res.status(404).json({ success: false, message: req.t('group_not_found') });
    }

    const group = groupRows[0];

    // Check if attendance record exists for this date
    const [attRows] = await pool.query(`
      SELECT 
        ta.*,
        pt.full_name AS teacher_name,
        pt.photo_url AS teacher_photo,
        pt.phone AS teacher_phone,
        st.full_name AS substitute_teacher_name,
        st.photo_url AS substitute_teacher_photo,
        st.phone AS substitute_teacher_phone
      FROM teacher_attendance ta
      JOIN teachers pt ON ta.teacher_id = pt.id
      LEFT JOIN teachers st ON ta.substitute_teacher_id = st.id
      WHERE ta.group_id = ? AND ta.date = ?
    `, [groupId, selectedDate]);

    if (attRows.length > 0) {
      return res.json({
        success: true,
        date: selectedDate,
        hasRecord: true,
        data: attRows[0]
      });
    }

    // If no record exists, return default state with primary teacher
    return res.json({
      success: true,
      date: selectedDate,
      hasRecord: false,
      data: {
        teacher_id: group.teacher_id,
        group_id: parseInt(groupId, 10),
        date: selectedDate,
        status: 'PRESENT',
        substitute_teacher_id: null,
        notes: '',
        teacher_name: group.teacher_name,
        teacher_photo: group.teacher_photo,
        teacher_phone: group.teacher_phone,
        substitute_teacher_name: null,
        substitute_teacher_photo: null
      }
    });
  } catch (error) {
    console.error('getGroupTeacherAttendance error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 2. Save or update teacher attendance & substitution for a session
export const saveTeacherAttendance = async (req, res) => {
  try {
    const { teacher_id, group_id, date, status, substitute_teacher_id, notes } = req.body;

    if (!teacher_id || !group_id || !date) {
      return res.status(400).json({
        success: false,
        message: req.t('bad_request')
      });
    }

    const subId = (status === 'ABSENT' || status === 'EXCUSED') && substitute_teacher_id
      ? parseInt(substitute_teacher_id, 10)
      : null;

    const userId = req.user?.id || null;
    const deviceId = req.deviceId || null;

    await pool.query(`
      INSERT INTO teacher_attendance (teacher_id, group_id, date, status, substitute_teacher_id, notes, user_id, device_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        substitute_teacher_id = VALUES(substitute_teacher_id),
        notes = VALUES(notes),
        user_id = VALUES(user_id),
        device_id = VALUES(device_id)
    `, [
      teacher_id,
      group_id,
      date,
      status || 'PRESENT',
      subId,
      notes ? notes.trim() : null,
      userId,
      deviceId
    ]);

    const [tName] = await pool.query('SELECT full_name FROM teachers WHERE id = ?', [teacher_id]);
    const teacherName = tName?.[0]?.full_name || '';
    logActivity(req, {
      action_type: 'ATTENDANCE',
      data_type: 'TEACHER_ATTENDANCE',
      entity_id: teacher_id,
      entity_name: teacherName,
      details: `تسجيل حضور الأستاذ/الشيخ "${teacherName}" ليوم ${date}: الحالة (${status || 'PRESENT'})`
    });

    // Return the updated record
    const [saved] = await pool.query(`
      SELECT 
        ta.*,
        pt.full_name AS teacher_name,
        pt.photo_url AS teacher_photo,
        st.full_name AS substitute_teacher_name,
        st.photo_url AS substitute_teacher_photo
      FROM teacher_attendance ta
      JOIN teachers pt ON ta.teacher_id = pt.id
      LEFT JOIN teachers st ON ta.substitute_teacher_id = st.id
      WHERE ta.group_id = ? AND ta.date = ?
    `, [group_id, date]);

    return res.json({
      success: true,
      message: req.t('attendance_saved_success'),
      data: saved[0]
    });
  } catch (error) {
    console.error('saveTeacherAttendance error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 3. Get history of absences and substitutions across teachers
export const getTeacherAbsenceReport = async (req, res) => {
  try {
    const { teacher_id, date_from, date_to } = req.query;

    let query = `
      SELECT 
        ta.*,
        g.name AS group_name,
        g.track_type,
        pt.full_name AS teacher_name,
        pt.phone AS teacher_phone,
        pt.photo_url AS teacher_photo,
        st.full_name AS substitute_teacher_name,
        st.phone AS substitute_teacher_phone,
        st.photo_url AS substitute_teacher_photo
      FROM teacher_attendance ta
      JOIN groups g ON ta.group_id = g.id
      JOIN teachers pt ON ta.teacher_id = pt.id
      LEFT JOIN teachers st ON ta.substitute_teacher_id = st.id
      WHERE 1=1
    `;
    const params = [];

    if (teacher_id) {
      query += ' AND (ta.teacher_id = ? OR ta.substitute_teacher_id = ?)';
      params.push(teacher_id, teacher_id);
    }

    if (date_from) {
      query += ' AND ta.date >= ?';
      params.push(date_from);
    }

    if (date_to) {
      query += ' AND ta.date <= ?';
      params.push(date_to);
    }

    query += ' ORDER BY ta.date DESC, ta.id DESC LIMIT 100';

    const [rows] = await pool.query(query, params);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('getTeacherAbsenceReport error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 4. Set temporary substitution for a date range (multiple days)
export const saveTeacherSubstitutionRange = async (req, res) => {
  try {
    const { teacher_id, group_id, substitute_teacher_id, start_date, end_date, notes } = req.body;

    if (!teacher_id || !group_id || !substitute_teacher_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: req.t('attendance_range_missing_fields')
      });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: req.t('bad_request')
      });
    }

    // Generate array of date strings (YYYY-MM-DD)
    const dates = [];
    const current = new Date(start);
    while (current <= end) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
      current.setDate(current.getDate() + 1);
    }

    if (dates.length > 90) {
      return res.status(400).json({
        success: false,
        message: req.t('bad_request')
      });
    }

    const subId = parseInt(substitute_teacher_id, 10);
    const cleanNotes = notes ? notes.trim() : 'Substitution';

    // Bulk upsert for each date in range
    for (const dateStr of dates) {
      await pool.query(`
        INSERT INTO teacher_attendance (teacher_id, group_id, date, status, substitute_teacher_id, notes)
        VALUES (?, ?, ?, 'ABSENT', ?, ?)
        ON DUPLICATE KEY UPDATE
          status = 'ABSENT',
          substitute_teacher_id = VALUES(substitute_teacher_id),
          notes = VALUES(notes)
      `, [
        teacher_id,
        group_id,
        dateStr,
        subId,
        cleanNotes
      ]);
    }

    return res.json({
      success: true,
      message: req.t('attendance_range_sub_success'),
      daysCount: dates.length
    });
  } catch (error) {
    console.error('saveTeacherSubstitutionRange error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};
