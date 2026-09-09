import pool from '../config/db.js';

export const getAcademicYears = async (req, res) => {
  try {
    const [years] = await pool.query(`
      SELECT 
        ay.*,
        (SELECT COUNT(*) FROM groups g WHERE g.academic_year_id = ay.id) AS groups_count,
        (SELECT COUNT(DISTINCT e.student_id) FROM enrollments e WHERE e.academic_year_id = ay.id AND e.status = 'ACTIVE') AS active_students_count
      FROM academic_years ay
      ORDER BY ay.start_date DESC
    `);
    return res.json({ success: true, data: years });
  } catch (error) {
    console.error('getAcademicYears error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const createAcademicYear = async (req, res) => {
  try {
    const { label, start_date, end_date, is_current } = req.body;
    if (!label || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: req.t('bad_request') });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      if (is_current) {
        await connection.query('UPDATE academic_years SET is_current = FALSE');
      }

      const [result] = await connection.query(`
        INSERT INTO academic_years (label, start_date, end_date, is_current, is_locked)
        VALUES (?, ?, ?, ?, FALSE)
      `, [label, start_date, end_date, is_current ? 1 : 0]);

      await connection.commit();
      return res.status(201).json({
        success: true,
        message: req.t('academic_year_created_success'),
        yearId: result.insertId
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('createAcademicYear error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const setCurrentYear = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query('UPDATE academic_years SET is_current = FALSE');
      await connection.query('UPDATE academic_years SET is_current = TRUE WHERE id = ?', [id]);
      await connection.commit();

      const [updated] = await pool.query('SELECT * FROM academic_years WHERE id = ?', [id]);
      return res.json({ success: true, message: req.t('academic_year_activated_success'), data: updated[0] });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('setCurrentYear error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const toggleLockYear = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT is_locked FROM academic_years WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: req.t('not_found') });
    }

    const newLockStatus = !existing[0].is_locked;
    await pool.query('UPDATE academic_years SET is_locked = ? WHERE id = ?', [newLockStatus, id]);

    return res.json({
      success: true,
      message: req.t('success'),
      is_locked: newLockStatus
    });
  } catch (error) {
    console.error('toggleLockYear error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// Annual Roll-over / Migration Wizard (الترحيل السنوي)
export const rolloverAcademicYear = async (req, res) => {
  const { source_year_id, target_year_id, clone_groups = true, re_enroll_students = true } = req.body;

  if (!source_year_id || !target_year_id) {
    return res.status(400).json({ success: false, message: req.t('bad_request') });
  }
  if (source_year_id === target_year_id) {
    return res.status(400).json({ success: false, message: req.t('bad_request') });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify source and target years
    const [years] = await connection.query('SELECT id, label, is_locked FROM academic_years WHERE id IN (?, ?)', [source_year_id, target_year_id]);
    if (years.length < 2) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: req.t('not_found') });
    }

    const targetYear = years.find(y => y.id == target_year_id);
    if (targetYear.is_locked) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: req.t('bad_request') });
    }

    let clonedGroupsCount = 0;
    let reEnrolledStudentsCount = 0;
    const groupMapping = new Map(); // sourceGroupId -> targetGroupId

    // 1. Clone Groups
    if (clone_groups) {
      const [sourceGroups] = await connection.query('SELECT * FROM groups WHERE academic_year_id = ?', [source_year_id]);
      
      for (const group of sourceGroups) {
        // Check if group with same name already exists in target year
        const [existing] = await connection.query(
          'SELECT id FROM groups WHERE academic_year_id = ? AND name = ?',
          [target_year_id, group.name]
        );

        let targetGroupId;
        if (existing.length > 0) {
          targetGroupId = existing[0].id;
        } else {
          const [result] = await connection.query(`
            INSERT INTO groups (academic_year_id, name, track_type, subject_name, teacher_id, room, schedule, is_free, monthly_fee)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            target_year_id,
            group.name,
            group.track_type,
            group.subject_name,
            group.teacher_id,
            group.room,
            group.schedule,
            group.is_free,
            group.monthly_fee
          ]);
          targetGroupId = result.insertId;
          clonedGroupsCount++;
        }

        groupMapping.set(group.id, targetGroupId);
      }
    }

    // 2. Re-enroll active students
    if (re_enroll_students && groupMapping.size > 0) {
      const [activeEnrollments] = await connection.query(`
        SELECT * FROM enrollments 
        WHERE academic_year_id = ? AND status = 'ACTIVE'
      `, [source_year_id]);

      const [targetYearData] = await connection.query('SELECT start_date FROM academic_years WHERE id = ?', [target_year_id]);
      const enrollmentDate = targetYearData[0]?.start_date || new Date().toISOString().split('T')[0];

      for (const enrollment of activeEnrollments) {
        const targetGroupId = groupMapping.get(enrollment.group_id);
        if (!targetGroupId) continue;

        // Check if student already enrolled in target group
        const [alreadyEnrolled] = await connection.query(`
          SELECT id FROM enrollments 
          WHERE academic_year_id = ? AND student_id = ? AND group_id = ?
        `, [target_year_id, enrollment.student_id, targetGroupId]);

        if (alreadyEnrolled.length === 0) {
          await connection.query(`
            INSERT INTO enrollments (academic_year_id, student_id, group_id, enrolled_at, status, discount_type, discount_value)
            VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
          `, [
            target_year_id,
            enrollment.student_id,
            targetGroupId,
            enrollmentDate,
            enrollment.discount_type,
            enrollment.discount_value
          ]);
          reEnrolledStudentsCount++;
        }
      }
    }

    await connection.commit();
    return res.json({
      success: true,
      message: req.t('academic_year_rollover_success'),
      stats: {
        clonedGroupsCount,
        reEnrolledStudentsCount
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('rolloverAcademicYear error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  } finally {
    connection.release();
  }
};
