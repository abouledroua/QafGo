import pool from '../config/db.js';

// 1. Get all teachers with assigned groups statistics
export const getTeachers = async (req, res) => {
  try {
    const { track_type, search } = req.query;
    let query = `
      SELECT 
        t.*,
        COUNT(g.id) AS groups_count,
        GROUP_CONCAT(g.name SEPARATOR '، ') AS groups_names
      FROM teachers t
      LEFT JOIN groups g ON g.teacher_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (track_type && track_type !== 'ALL') {
      query += ' AND (t.track_type LIKE ? OR t.track_type = "GENERAL" OR t.track_type LIKE "%ALL%")';
      params.push(`%${track_type}%`);
    }

    if (search && search.trim()) {
      query += ' AND (t.full_name LIKE ? OR t.specialty LIKE ? OR t.phone LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ' GROUP BY t.id ORDER BY t.full_name ASC';
    const [rows] = await pool.query(query, params);

    const formatted = rows.map(t => ({
      ...t,
      track_types: t.track_type 
        ? t.track_type.split(',').map(s => s.trim()).filter(Boolean)
        : ['GENERAL']
    }));

    return res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('getTeachers error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 2. Get single teacher by ID
export const getTeacherById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT t.*, COUNT(g.id) AS groups_count, GROUP_CONCAT(g.name SEPARATOR '، ') AS groups_names
       FROM teachers t
       LEFT JOIN groups g ON g.teacher_id = t.id
       WHERE t.id = ?
       GROUP BY t.id`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: req.t('teacher_not_found') });
    }

    // Also get list of groups assigned
    const [assignedGroups] = await pool.query(
      `SELECT g.id, g.name, g.track_type, g.room, g.schedule, ay.label AS year_label
       FROM groups g
       LEFT JOIN academic_years ay ON g.academic_year_id = ay.id
       WHERE g.teacher_id = ?
       ORDER BY g.name ASC`,
      [id]
    );

    const teacher = rows[0];
    const track_types = teacher.track_type 
      ? teacher.track_type.split(',').map(s => s.trim()).filter(Boolean)
      : ['GENERAL'];

    return res.json({ 
      success: true, 
      data: { 
        ...teacher, 
        track_types, 
        groups: assignedGroups 
      } 
    });
  } catch (error) {
    console.error('getTeacherById error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 3. Create a new teacher
export const createTeacher = async (req, res) => {
  try {
    const { full_name, phone, email, specialty, track_type, track_types, bio, photo_url } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, message: req.t('teacher_name_phone_required') });
    }

    // Process multiple track types
    let finalTrackType = 'GENERAL';
    if (Array.isArray(track_types) && track_types.length > 0) {
      finalTrackType = track_types.join(',');
    } else if (Array.isArray(track_type) && track_type.length > 0) {
      finalTrackType = track_type.join(',');
    } else if (typeof track_type === 'string' && track_type.trim()) {
      finalTrackType = track_type.trim();
    }

    const [result] = await pool.query(
      `INSERT INTO teachers (full_name, phone, email, specialty, track_type, bio, photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        full_name.trim(),
        phone ? phone.trim() : null,
        email ? email.trim() : null,
        specialty ? specialty.trim() : null,
        finalTrackType,
        bio ? bio.trim() : null,
        photo_url ? photo_url.trim() : null
      ]
    );

    const newTeacherId = result.insertId;
    const [created] = await pool.query('SELECT * FROM teachers WHERE id = ?', [newTeacherId]);

    const createdTeacher = created[0];
    return res.status(201).json({
      success: true,
      message: req.t('teacher_created_success'),
      data: {
        ...createdTeacher,
        track_types: createdTeacher.track_type ? createdTeacher.track_type.split(',').map(s => s.trim()) : ['GENERAL']
      }
    });
  } catch (error) {
    console.error('createTeacher error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 4. Update teacher
export const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, email, specialty, track_type, track_types, bio, photo_url } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, message: req.t('teacher_name_phone_required') });
    }

    const [existing] = await pool.query('SELECT id FROM teachers WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: req.t('teacher_not_found') });
    }

    // Process multiple track types
    let finalTrackType = 'GENERAL';
    if (Array.isArray(track_types) && track_types.length > 0) {
      finalTrackType = track_types.join(',');
    } else if (Array.isArray(track_type) && track_type.length > 0) {
      finalTrackType = track_type.join(',');
    } else if (typeof track_type === 'string' && track_type.trim()) {
      finalTrackType = track_type.trim();
    }

    await pool.query(
      `UPDATE teachers 
       SET full_name = ?, phone = ?, email = ?, specialty = ?, track_type = ?, bio = ?, photo_url = ?
       WHERE id = ?`,
      [
        full_name.trim(),
        phone ? phone.trim() : null,
        email ? email.trim() : null,
        specialty ? specialty.trim() : null,
        finalTrackType,
        bio ? bio.trim() : null,
        photo_url ? photo_url.trim() : null,
        id
      ]
    );

    const [updated] = await pool.query('SELECT * FROM teachers WHERE id = ?', [id]);
    const updatedTeacher = updated[0];

    return res.json({
      success: true,
      message: req.t('teacher_updated_success'),
      data: {
        ...updatedTeacher,
        track_types: updatedTeacher.track_type ? updatedTeacher.track_type.split(',').map(s => s.trim()) : ['GENERAL']
      }
    });
  } catch (error) {
    console.error('updateTeacher error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 5. Delete teacher
export const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if teacher has linked groups
    const [groups] = await pool.query('SELECT COUNT(*) AS count FROM groups WHERE teacher_id = ?', [id]);
    if (groups[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: req.t('teacher_cannot_delete_has_groups')
      });
    }

    const [result] = await pool.query('DELETE FROM teachers WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: req.t('teacher_not_found') });
    }

    return res.json({ success: true, message: req.t('teacher_deleted_success') });
  } catch (error) {
    console.error('deleteTeacher error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};
