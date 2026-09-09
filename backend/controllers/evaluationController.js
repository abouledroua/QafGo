import pool from '../config/db.js';

// --- المسار القرآني (Tahfiz) ---
export const logTahfizSession = async (req, res) => {
  try {
    const {
      enrollment_id,
      date,
      type = 'MEMORIZATION',
      surah_from,
      ayah_from,
      surah_to,
      ayah_to,
      hizb_from,
      hizb_to,
      grade = 'MUMTAZ',
      notes
    } = req.body;

    if (!enrollment_id || !date || !surah_from || !surah_to) {
      return res.status(400).json({ success: false, message: req.t('bad_request') });
    }

    const [result] = await pool.query(`
      INSERT INTO tahfiz_logs (enrollment_id, date, type, surah_from, ayah_from, surah_to, ayah_to, hizb_from, hizb_to, grade, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      enrollment_id,
      date,
      type,
      surah_from,
      ayah_from || 1,
      surah_to,
      ayah_to || 1,
      hizb_from || null,
      hizb_to || null,
      grade,
      notes || null
    ]);

    return res.status(201).json({
      success: true,
      message: req.t('evaluation_saved_success'),
      id: result.insertId
    });
  } catch (error) {
    console.error('logTahfizSession error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const getTahfizLogsByEnrollment = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const [rows] = await pool.query(`
      SELECT * FROM tahfiz_logs WHERE enrollment_id = ? ORDER BY date DESC
    `, [enrollmentId]);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('getTahfizLogsByEnrollment error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// --- مسار التعليم المبكر والتحضيري (PreSchool) ---
export const logPreschoolSkill = async (req, res) => {
  try {
    const {
      enrollment_id,
      date,
      skill_category,
      activity_title,
      score_rating = 'EXCELLENT',
      behavior_note
    } = req.body;

    if (!enrollment_id || !date || !skill_category) {
      return res.status(400).json({ success: false, message: req.t('bad_request') });
    }

    const [result] = await pool.query(`
      INSERT INTO preschool_logs (enrollment_id, date, skill_category, activity_title, score_rating, behavior_note)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      enrollment_id,
      date,
      skill_category,
      activity_title || null,
      score_rating,
      behavior_note || null
    ]);

    return res.status(201).json({
      success: true,
      message: req.t('evaluation_saved_success'),
      id: result.insertId
    });
  } catch (error) {
    console.error('logPreschoolSkill error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const getPreschoolLogsByEnrollment = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const [rows] = await pool.query(`
      SELECT * FROM preschool_logs WHERE enrollment_id = ? ORDER BY date DESC
    `, [enrollmentId]);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('getPreschoolLogsByEnrollment error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// --- مسار دروس الدعم والتقوية (Tutoring) ---
export const logTutoringGrade = async (req, res) => {
  try {
    const {
      enrollment_id,
      exam_title,
      score,
      max_score = 20.00,
      exam_date,
      teacher_notes
    } = req.body;

    if (!enrollment_id || !exam_title || score === undefined || !exam_date) {
      return res.status(400).json({ success: false, message: req.t('bad_request') });
    }

    const [result] = await pool.query(`
      INSERT INTO tutoring_grades (enrollment_id, exam_title, score, max_score, exam_date, teacher_notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      enrollment_id,
      exam_title,
      score,
      max_score,
      exam_date,
      teacher_notes || null
    ]);

    return res.status(201).json({
      success: true,
      message: req.t('evaluation_saved_success'),
      id: result.insertId
    });
  } catch (error) {
    console.error('logTutoringGrade error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const getTutoringGradesByEnrollment = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const [rows] = await pool.query(`
      SELECT * FROM tutoring_grades WHERE enrollment_id = ? ORDER BY exam_date DESC
    `, [enrollmentId]);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('getTutoringGradesByEnrollment error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

