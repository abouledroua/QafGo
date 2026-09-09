import pool from '../config/db.js';

// 1. Get all classrooms with usage stats
export const getAllClassrooms = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        c.*,
        (SELECT COUNT(DISTINCT group_id) FROM timetable_sessions ts WHERE ts.classroom_id = c.id) AS active_groups_count,
        (SELECT COUNT(*) FROM timetable_sessions ts WHERE ts.classroom_id = c.id) AS weekly_sessions_count
      FROM classrooms c
      ORDER BY c.name ASC
    `);

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('getAllClassrooms error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 2. Get single classroom by ID
export const getClassroomById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM classrooms WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: req.t('classroom_not_found') });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('getClassroomById error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 3. Create a new classroom
export const createClassroom = async (req, res) => {
  try {
    const { name, code, capacity, type, equipment, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: req.t('bad_request') });
    }

    const [result] = await pool.query(`
      INSERT INTO classrooms (name, code, capacity, type, equipment, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      name.trim(),
      code ? code.trim() : null,
      parseInt(capacity, 10) || 25,
      type || 'GENERAL',
      equipment ? equipment.trim() : null,
      status || 'AVAILABLE'
    ]);

    const [newClassroom] = await pool.query('SELECT * FROM classrooms WHERE id = ?', [result.insertId]);

    return res.status(201).json({
      success: true,
      message: req.t('classroom_created_success'),
      data: newClassroom[0]
    });
  } catch (error) {
    console.error('createClassroom error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 4. Update existing classroom
export const updateClassroom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, capacity, type, equipment, status } = req.body;

    const [existing] = await pool.query('SELECT * FROM classrooms WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: req.t('classroom_not_found') });
    }

    const current = existing[0];

    await pool.query(`
      UPDATE classrooms
      SET name = ?, code = ?, capacity = ?, type = ?, equipment = ?, status = ?
      WHERE id = ?
    `, [
      name !== undefined ? name.trim() : current.name,
      code !== undefined ? (code ? code.trim() : null) : current.code,
      capacity !== undefined ? (parseInt(capacity, 10) || 25) : current.capacity,
      type !== undefined ? type : current.type,
      equipment !== undefined ? (equipment ? equipment.trim() : null) : current.equipment,
      status !== undefined ? status : current.status,
      id
    ]);

    const [updated] = await pool.query('SELECT * FROM classrooms WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: req.t('classroom_updated_success'),
      data: updated[0]
    });
  } catch (error) {
    console.error('updateClassroom error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 5. Delete classroom
export const deleteClassroom = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM classrooms WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: req.t('classroom_not_found') });
    }

    await pool.query('DELETE FROM classrooms WHERE id = ?', [id]);

    return res.json({ success: true, message: req.t('classroom_deleted_success') });
  } catch (error) {
    console.error('deleteClassroom error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

