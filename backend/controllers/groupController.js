import pool from '../config/db.js';

export const getGroups = async (req, res) => {
  try {
    const { academic_year_id, track_type, search, status } = req.query;

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

    if (search) {
      query += ` AND (g.name LIKE ? OR g.subject_name LIKE ? OR t.full_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
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

    return res.json({ success: true, data: { ...group, students } });
  } catch (error) {
    console.error('getGroupById error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const createGroup = async (req, res) => {
  try {
    const {
      academic_year_id,
      name,
      track_type,
      subject_name,
      teacher_id,
      room,
      schedule,
      is_free,
      monthly_fee
    } = req.body;

    if (!academic_year_id || !name || !track_type) {
      return res.status(400).json({ success: false, message: req.t('bad_request') });
    }

    const fee = is_free ? 0.00 : (monthly_fee || 0.00);

    const [result] = await pool.query(`
      INSERT INTO groups (academic_year_id, name, track_type, subject_name, teacher_id, room, schedule, is_free, monthly_fee, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `, [
      academic_year_id,
      name,
      track_type,
      subject_name || null,
      teacher_id || null,
      room || null,
      schedule || null,
      is_free ? 1 : 0,
      fee
    ]);

    return res.status(201).json({
      success: true,
      message: req.t('group_created_success'),
      groupId: result.insertId,
      status: 'PENDING'
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
      teacher_id,
      room = current.room,
      schedule = current.schedule,
      is_free,
      monthly_fee,
      status
    } = req.body;

    const finalIsFree = is_free !== undefined ? (is_free ? 1 : 0) : current.is_free;
    const finalMonthlyFee = finalIsFree ? 0.00 : (monthly_fee !== undefined ? (parseFloat(monthly_fee) || 0.00) : current.monthly_fee);
    const finalTeacherId = teacher_id !== undefined ? (teacher_id ? parseInt(teacher_id, 10) : null) : current.teacher_id;
    const validStatuses = ['PENDING', 'ACTIVE', 'STOPPED', 'ARCHIVED'];
    const finalStatus = (status && validStatuses.includes(status)) ? status : current.status;

    await pool.query(`
      UPDATE groups 
      SET name = ?, track_type = ?, subject_name = ?, teacher_id = ?, room = ?, schedule = ?, is_free = ?, monthly_fee = ?, status = ?
      WHERE id = ?
    `, [
      name,
      track_type,
      subject_name || null,
      finalTeacherId,
      room || null,
      schedule || null,
      finalIsFree,
      finalMonthlyFee,
      finalStatus,
      id
    ]);

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
    await pool.query('DELETE FROM groups WHERE id = ?', [id]);
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

    const [groupRows] = await pool.query('SELECT academic_year_id FROM groups WHERE id = ?', [group_id]);
    if (groupRows.length === 0) {
      return res.status(404).json({ success: false, message: req.t('group_not_found') });
    }
    const academic_year_id = groupRows[0].academic_year_id;

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
