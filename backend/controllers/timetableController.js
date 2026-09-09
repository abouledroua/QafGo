import pool from '../config/db.js';

// Helper: Check for schedule conflicts
async function checkScheduleConflicts({
  academic_year_id,
  day_of_week,
  start_time,
  end_time,
  classroom_id,
  teacher_id,
  group_id,
  exclude_session_id = null,
  t = null
}) {
  const conflicts = [];

  // 1. Check classroom conflict
  if (classroom_id) {
    let query = `
      SELECT ts.*, g.name AS group_name, c.name AS classroom_name
      FROM timetable_sessions ts
      JOIN groups g ON ts.group_id = g.id
      JOIN classrooms c ON ts.classroom_id = c.id
      WHERE ts.academic_year_id = ?
        AND ts.day_of_week = ?
        AND ts.classroom_id = ?
        AND (ts.start_time < ? AND ts.end_time > ?)
    `;
    const params = [academic_year_id, day_of_week, classroom_id, end_time, start_time];
    if (exclude_session_id) {
      query += ' AND ts.id != ?';
      params.push(exclude_session_id);
    }

    const [roomConflicts] = await pool.query(query, params);
    if (roomConflicts.length > 0) {
      const timeStr = `${roomConflicts[0].start_time.slice(0, 5)} - ${roomConflicts[0].end_time.slice(0, 5)}`;
      conflicts.push(t ? t('timetable_conflict_room', {
        room: roomConflicts[0].classroom_name,
        group: roomConflicts[0].group_name,
        time: timeStr
      }) : `تعارض في القاعة: القاعة (${roomConflicts[0].classroom_name}) محجوزة مسبقاً لفوج (${roomConflicts[0].group_name}) في نفس هذا التوقيت (${timeStr})`);
    }
  }

  // 2. Check teacher conflict
  if (teacher_id) {
    let query = `
      SELECT ts.*, g.name AS group_name, t.full_name AS teacher_name
      FROM timetable_sessions ts
      JOIN groups g ON ts.group_id = g.id
      JOIN teachers t ON ts.teacher_id = t.id
      WHERE ts.academic_year_id = ?
        AND ts.day_of_week = ?
        AND ts.teacher_id = ?
        AND (ts.start_time < ? AND ts.end_time > ?)
    `;
    const params = [academic_year_id, day_of_week, teacher_id, end_time, start_time];
    if (exclude_session_id) {
      query += ' AND ts.id != ?';
      params.push(exclude_session_id);
    }

    const [teacherConflicts] = await pool.query(query, params);
    if (teacherConflicts.length > 0) {
      const timeStr = `${teacherConflicts[0].start_time.slice(0, 5)} - ${teacherConflicts[0].end_time.slice(0, 5)}`;
      conflicts.push(t ? t('timetable_conflict_teacher', {
        teacher: teacherConflicts[0].teacher_name,
        group: teacherConflicts[0].group_name,
        time: timeStr
      }) : `تعارض في جدول الأستاذ: الأستاذ (${teacherConflicts[0].teacher_name}) لديه حصة أخرى مبرمجة لفوج (${teacherConflicts[0].group_name}) في نفس التوقيت (${timeStr})`);
    }
  }

  // 3. Check group conflict
  if (group_id) {
    let query = `
      SELECT ts.*, g.name AS group_name
      FROM timetable_sessions ts
      JOIN groups g ON ts.group_id = g.id
      WHERE ts.academic_year_id = ?
        AND ts.day_of_week = ?
        AND ts.group_id = ?
        AND (ts.start_time < ? AND ts.end_time > ?)
    `;
    const params = [academic_year_id, day_of_week, group_id, end_time, start_time];
    if (exclude_session_id) {
      query += ' AND ts.id != ?';
      params.push(exclude_session_id);
    }

    const [groupConflicts] = await pool.query(query, params);
    if (groupConflicts.length > 0) {
      const timeStr = `${groupConflicts[0].start_time.slice(0, 5)} - ${groupConflicts[0].end_time.slice(0, 5)}`;
      conflicts.push(t ? t('timetable_conflict_group', {
        time: timeStr
      }) : `تعارض في الفوج: الفوج لديه حصة أخرى مبرمجة مسبقاً في نفس هذا التوقيت (${timeStr})`);
    }
  }

  return conflicts;
}

// 1. Get weekly timetable with filters
export const getWeeklyTimetable = async (req, res) => {
  try {
    const { academic_year_id, classroom_id, teacher_id, group_id, day_of_week } = req.query;

    let query = `
      SELECT 
        ts.id,
        ts.academic_year_id,
        ts.group_id,
        ts.classroom_id,
        ts.teacher_id,
        ts.day_of_week,
        DATE_FORMAT(ts.start_time, '%H:%i') AS start_time,
        DATE_FORMAT(ts.end_time, '%H:%i') AS end_time,
        ts.notes,
        ts.created_at,
        g.name AS group_name,
        g.track_type,
        g.subject_name,
        g.is_free,
        c.name AS classroom_name,
        c.code AS classroom_code,
        c.capacity AS classroom_capacity,
        c.type AS classroom_type,
        t.full_name AS teacher_name,
        t.phone AS teacher_phone,
        t.photo_url AS teacher_photo
      FROM timetable_sessions ts
      JOIN groups g ON ts.group_id = g.id
      LEFT JOIN classrooms c ON ts.classroom_id = c.id
      LEFT JOIN teachers t ON ts.teacher_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (academic_year_id) {
      query += ' AND ts.academic_year_id = ?';
      params.push(academic_year_id);
    }

    if (classroom_id) {
      query += ' AND ts.classroom_id = ?';
      params.push(classroom_id);
    }

    if (teacher_id) {
      query += ' AND ts.teacher_id = ?';
      params.push(teacher_id);
    }

    if (group_id) {
      query += ' AND ts.group_id = ?';
      params.push(group_id);
    }

    if (day_of_week) {
      query += ' AND ts.day_of_week = ?';
      params.push(day_of_week);
    }

    // Order by day of week custom sequence (Saturday first), then start_time
    query += `
      ORDER BY 
        FIELD(ts.day_of_week, 'SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'),
        ts.start_time ASC
    `;

    const [rows] = await pool.query(query, params);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('getWeeklyTimetable error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 2. Create a timetable session
export const createTimetableSession = async (req, res) => {
  try {
    const {
      academic_year_id,
      group_id,
      classroom_id,
      teacher_id,
      day_of_week,
      start_time,
      end_time,
      notes
    } = req.body;

    if (!academic_year_id || !group_id || !day_of_week || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: req.t('bad_request')
      });
    }

    // If teacher_id not provided explicitly, default to group's assigned teacher
    let finalTeacherId = teacher_id ? parseInt(teacher_id, 10) : null;
    let finalClassroomId = classroom_id ? parseInt(classroom_id, 10) : null;

    if (!finalTeacherId) {
      const [grp] = await pool.query('SELECT teacher_id FROM groups WHERE id = ?', [group_id]);
      if (grp.length > 0 && grp[0].teacher_id) {
        finalTeacherId = grp[0].teacher_id;
      }
    }

    // Format times
    const cleanStart = start_time.length === 5 ? `${start_time}:00` : start_time;
    const cleanEnd = end_time.length === 5 ? `${end_time}:00` : end_time;

    if (cleanStart >= cleanEnd) {
      return res.status(400).json({
        success: false,
        message: req.t('bad_request')
      });
    }

    // Conflict Check
    const conflicts = await checkScheduleConflicts({
      academic_year_id,
      day_of_week,
      start_time: cleanStart,
      end_time: cleanEnd,
      classroom_id: finalClassroomId,
      teacher_id: finalTeacherId,
      group_id: parseInt(group_id, 10),
      t: req.t
    });

    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: req.t('timetable_clash_detected'),
        conflicts
      });
    }

    const [result] = await pool.query(`
      INSERT INTO timetable_sessions (
        academic_year_id, group_id, classroom_id, teacher_id, day_of_week, start_time, end_time, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      academic_year_id,
      group_id,
      finalClassroomId,
      finalTeacherId,
      day_of_week,
      cleanStart,
      cleanEnd,
      notes ? notes.trim() : null
    ]);

    // Also update group room / schedule string for backward compatibility
    if (finalClassroomId) {
      const [c] = await pool.query('SELECT name FROM classrooms WHERE id = ?', [finalClassroomId]);
      if (c.length > 0) {
        await pool.query('UPDATE groups SET room = ? WHERE id = ?', [c[0].name, group_id]);
      }
    }

    const [newSession] = await pool.query(`
      SELECT 
        ts.*,
        DATE_FORMAT(ts.start_time, '%H:%i') AS start_time,
        DATE_FORMAT(ts.end_time, '%H:%i') AS end_time,
        g.name AS group_name,
        g.track_type,
        c.name AS classroom_name,
        t.full_name AS teacher_name
      FROM timetable_sessions ts
      JOIN groups g ON ts.group_id = g.id
      LEFT JOIN classrooms c ON ts.classroom_id = c.id
      LEFT JOIN teachers t ON ts.teacher_id = t.id
      WHERE ts.id = ?
    `, [result.insertId]);

    return res.status(201).json({
      success: true,
      message: req.t('timetable_slot_created_success'),
      data: newSession[0]
    });
  } catch (error) {
    console.error('createTimetableSession error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 3. Update a timetable session
export const updateTimetableSession = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      academic_year_id,
      group_id,
      classroom_id,
      teacher_id,
      day_of_week,
      start_time,
      end_time,
      notes
    } = req.body;

    const [existing] = await pool.query('SELECT * FROM timetable_sessions WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: req.t('not_found') });
    }
    const current = existing[0];

    const finalYearId = academic_year_id || current.academic_year_id;
    const finalGroupId = group_id ? parseInt(group_id, 10) : current.group_id;
    const finalClassroomId = classroom_id !== undefined ? (classroom_id ? parseInt(classroom_id, 10) : null) : current.classroom_id;
    const finalTeacherId = teacher_id !== undefined ? (teacher_id ? parseInt(teacher_id, 10) : null) : current.teacher_id;
    const finalDay = day_of_week || current.day_of_week;
    
    let cleanStart = start_time || current.start_time;
    if (typeof cleanStart === 'string' && cleanStart.length === 5) cleanStart = `${cleanStart}:00`;
    let cleanEnd = end_time || current.end_time;
    if (typeof cleanEnd === 'string' && cleanEnd.length === 5) cleanEnd = `${cleanEnd}:00`;

    if (cleanStart >= cleanEnd) {
      return res.status(400).json({
        success: false,
        message: req.t('bad_request')
      });
    }

    // Conflict check excluding this session
    const conflicts = await checkScheduleConflicts({
      academic_year_id: finalYearId,
      day_of_week: finalDay,
      start_time: cleanStart,
      end_time: cleanEnd,
      classroom_id: finalClassroomId,
      teacher_id: finalTeacherId,
      group_id: finalGroupId,
      exclude_session_id: id,
      t: req.t
    });

    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: req.t('timetable_clash_detected'),
        conflicts
      });
    }

    await pool.query(`
      UPDATE timetable_sessions
      SET academic_year_id = ?, group_id = ?, classroom_id = ?, teacher_id = ?, day_of_week = ?, start_time = ?, end_time = ?, notes = ?
      WHERE id = ?
    `, [
      finalYearId,
      finalGroupId,
      finalClassroomId,
      finalTeacherId,
      finalDay,
      cleanStart,
      cleanEnd,
      notes !== undefined ? (notes ? notes.trim() : null) : current.notes,
      id
    ]);

    const [updated] = await pool.query(`
      SELECT 
        ts.*,
        DATE_FORMAT(ts.start_time, '%H:%i') AS start_time,
        DATE_FORMAT(ts.end_time, '%H:%i') AS end_time,
        g.name AS group_name,
        g.track_type,
        c.name AS classroom_name,
        t.full_name AS teacher_name
      FROM timetable_sessions ts
      JOIN groups g ON ts.group_id = g.id
      LEFT JOIN classrooms c ON ts.classroom_id = c.id
      LEFT JOIN teachers t ON ts.teacher_id = t.id
      WHERE ts.id = ?
    `, [id]);

    return res.json({
      success: true,
      message: req.t('success'),
      data: updated[0]
    });
  } catch (error) {
    console.error('updateTimetableSession error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 4. Delete a timetable session
export const deleteTimetableSession = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM timetable_sessions WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: req.t('not_found') });
    }

    await pool.query('DELETE FROM timetable_sessions WHERE id = ?', [id]);
    return res.json({ success: true, message: req.t('timetable_slot_deleted_success') });
  } catch (error) {
    console.error('deleteTimetableSession error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};
