import pool from '../config/db.js';
import { logActivity } from '../utils/auditLogger.js';
import { getGroupGenderPolicy } from './settingsController.js';

export const executeTransfer = async (req, res) => {
  const {
    student_id,
    academic_year_id,
    current_enrollment_id,
    target_group_id,
    reason,
    discount_type = 'NONE',
    discount_value = 0.00
  } = req.body;

  if (!student_id || !academic_year_id || !current_enrollment_id || !target_group_id || !reason) {
    return res.status(400).json({
      success: false,
      message: req.t('transfer_reason_required')
    });
  }

  const connection = await pool.getConnection();
  try {
    // START ATOMIC SQL TRANSACTION
    await connection.beginTransaction();

    // 1. Verify current enrollment
    const [currRows] = await connection.query(`
      SELECT * FROM enrollments 
      WHERE id = ? AND student_id = ? AND academic_year_id = ? AND status = 'ACTIVE'
    `, [current_enrollment_id, student_id, academic_year_id]);

    if (currRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: req.t('bad_request')
      });
    }

    const currentEnrollment = currRows[0];
    const from_group_id = currentEnrollment.group_id;

    if (from_group_id == target_group_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: req.t('transfer_same_group_error')
      });
    }

    // 2. Verify target group exists and belongs to the same academic year
    const [targetGroupRows] = await connection.query(`
      SELECT * FROM groups WHERE id = ? AND academic_year_id = ?
    `, [target_group_id, academic_year_id]);

    if (targetGroupRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: req.t('group_not_found')
      });
    }

    const targetGroup = targetGroupRows[0];
    const policy = await getGroupGenderPolicy();

    if (policy === 'SEPARATED' && targetGroup.gender && targetGroup.gender !== 'ALL') {
      const [sRows] = await connection.query('SELECT gender FROM students WHERE id = ?', [student_id]);
      if (sRows.length > 0 && sRows[0].gender !== targetGroup.gender) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: req.t('student_gender_mismatch_group') || 'لا يمكن تحويل الطالب إلى فوج مخصص للجنس الآخر'
        });
      }
    }

    const today = new Date().toISOString().split('T')[0];

    // 3. Update current enrollment to TRANSFERRED
    await connection.query(`
      UPDATE enrollments 
      SET status = 'TRANSFERRED', ended_at = ?, transfer_reason = ?
      WHERE id = ?
    `, [today, reason, current_enrollment_id]);

    // 4. Open new active enrollment in the target group
    const [newEnrollmentResult] = await connection.query(`
      INSERT INTO enrollments (academic_year_id, student_id, group_id, enrolled_at, status, discount_type, discount_value)
      VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
    `, [
      academic_year_id,
      student_id,
      target_group_id,
      today,
      discount_type,
      discount_value
    ]);

    // 5. Log transfer in transfers_log
    const createdBy = req.user?.full_name || 'إدارة المنصة';
    const userId = req.user?.id || null;
    const deviceId = req.deviceId || null;
    const [transferLogResult] = await connection.query(`
      INSERT INTO transfers_log (academic_year_id, student_id, from_group_id, to_group_id, transfer_date, reason, created_by, user_id, device_id)
      VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?)
    `, [
      academic_year_id,
      student_id,
      from_group_id,
      target_group_id,
      reason,
      createdBy,
      userId,
      deviceId
    ]);

    // COMMIT ATOMIC TRANSACTION
    await connection.commit();

    const [stRow] = await pool.query('SELECT full_name, reg_no FROM students WHERE id = ?', [student_id]);
    const studentName = stRow?.[0]?.full_name || '';
    const [fromGroup] = await pool.query('SELECT name FROM groups WHERE id = ?', [from_group_id]);
    const fromGroupName = fromGroup?.[0]?.name || '';
    const toGroupName = targetGroupRows[0]?.name || '';

    logActivity(req, {
      action_type: 'TRANSFER',
      data_type: 'TRANSFER',
      entity_id: transferLogResult.insertId,
      entity_name: studentName,
      details: `تحويل الطالب "${studentName}" من فوج "${fromGroupName}" إلى فوج "${toGroupName}". السبب: ${reason}`
    });

    return res.status(201).json({
      success: true,
      message: req.t('student_transfer_success'),
      data: {
        transfer_id: transferLogResult.insertId,
        new_enrollment_id: newEnrollmentResult.insertId,
        student_id,
        from_group_id,
        to_group_id: target_group_id,
        transfer_date: today,
        reason
      }
    });

  } catch (error) {
    // ROLLBACK ON ERROR
    await connection.rollback();
    console.error('executeTransfer error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  } finally {
    connection.release();
  }
};

export const getTransfersLog = async (req, res) => {
  try {
    const { academic_year_id } = req.query;

    let query = `
      SELECT 
        tl.*,
        s.reg_no,
        s.full_name AS student_name,
        fg.name AS from_group_name,
        fg.track_type AS from_track_type,
        tg.name AS to_group_name,
        tg.track_type AS to_track_type,
        ay.label AS academic_year_label
      FROM transfers_log tl
      JOIN students s ON tl.student_id = s.id
      JOIN groups fg ON tl.from_group_id = fg.id
      JOIN groups tg ON tl.to_group_id = tg.id
      JOIN academic_years ay ON tl.academic_year_id = ay.id
      WHERE 1=1
    `;
    const params = [];

    if (academic_year_id) {
      query += ` AND tl.academic_year_id = ?`;
      params.push(academic_year_id);
    }

    query += ` ORDER BY tl.transfer_date DESC`;

    const [rows] = await pool.query(query, params);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('getTransfersLog error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};
