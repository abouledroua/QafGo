import pool from '../config/db.js';
import { logActivity } from '../utils/auditLogger.js';

export const getFinanceOverview = async (req, res) => {
  try {
    const { academic_year_id } = req.query;
    if (!academic_year_id) {
      return res.status(400).json({ success: false, message: req.t('bad_request') });
    }

    // 1. Total revenue collected and exemption vouchers
    const [paymentStats] = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN amount ELSE 0 END), 0) AS total_revenue,
        COUNT(CASE WHEN payment_status = 'PAID' THEN 1 END) AS total_paid_receipts,
        COUNT(CASE WHEN payment_status = 'EXEMPTED' THEN 1 END) AS total_exemption_vouchers
      FROM payments
      WHERE academic_year_id = ?
    `, [academic_year_id]);

    // 2. Active students breakdown by group pricing & exemptions
    const [enrollmentStats] = await pool.query(`
      SELECT 
        COUNT(DISTINCT e.student_id) AS total_active_students,
        COUNT(DISTINCT CASE WHEN g.is_free = 1 THEN e.student_id END) AS students_in_free_groups,
        COUNT(DISTINCT CASE WHEN g.is_free = 0 AND e.discount_type = 'FULL_EXEMPTION' THEN e.student_id END) AS students_with_scholarships,
        COUNT(DISTINCT CASE WHEN g.is_free = 0 AND e.discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT') THEN e.student_id END) AS students_with_partial_discounts,
        COUNT(DISTINCT CASE WHEN g.is_free = 0 AND e.discount_type = 'NONE' THEN e.student_id END) AS students_regular_paying
      FROM enrollments e
      JOIN groups g ON e.group_id = g.id
      WHERE e.academic_year_id = ? AND e.status = 'ACTIVE'
    `, [academic_year_id]);

    return res.json({
      success: true,
      data: {
        financial: paymentStats[0],
        enrollments: enrollmentStats[0]
      }
    });
  } catch (error) {
    console.error('getFinanceOverview error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const getPayments = async (req, res) => {
  try {
    const { academic_year_id, status, month_ref, search } = req.query;

    let query = `
      SELECT 
        p.*,
        s.reg_no,
        s.full_name AS student_name,
        s.guardian_phone,
        g.name AS group_name,
        g.track_type,
        g.is_free,
        g.monthly_fee AS group_original_fee,
        ay.label AS academic_year_label
      FROM payments p
      JOIN students s ON p.student_id = s.id
      JOIN groups g ON p.group_id = g.id
      JOIN academic_years ay ON p.academic_year_id = ay.id
      WHERE 1=1
    `;
    const params = [];

    if (academic_year_id) {
      query += ` AND p.academic_year_id = ?`;
      params.push(academic_year_id);
    }

    if (status) {
      query += ` AND p.payment_status = ?`;
      params.push(status);
    }

    if (month_ref) {
      query += ` AND p.month_ref = ?`;
      params.push(month_ref);
    }

    if (search) {
      query += ` AND (s.full_name LIKE ? OR s.reg_no LIKE ? OR p.receipt_no LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY p.payment_date DESC, p.id DESC`;

    const [rows] = await pool.query(query, params);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('getPayments error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const createPaymentOrVoucher = async (req, res) => {
  try {
    const {
      academic_year_id,
      student_id,
      group_id,
      amount,
      payment_date,
      month_ref,
      payment_status = 'PAID',
      notes
    } = req.body;

    if (!academic_year_id || !student_id || !group_id || !month_ref || !payment_date) {
      return res.status(400).json({ success: false, message: req.t('bad_request') });
    }

    // Fetch group & student enrollment info to check expected fee
    const [enrollments] = await pool.query(`
      SELECT e.discount_type, e.discount_value, g.monthly_fee, g.is_free
      FROM enrollments e
      JOIN groups g ON e.group_id = g.id
      WHERE e.academic_year_id = ? AND e.student_id = ? AND e.group_id = ?
      LIMIT 1
    `, [academic_year_id, student_id, group_id]);

    let expectedFee = 0;
    if (enrollments.length > 0) {
      const enr = enrollments[0];
      const monthlyFee = parseFloat(enr.monthly_fee || 0);
      if (enr.is_free === 1 || enr.discount_type === 'FULL_EXEMPTION') {
        expectedFee = 0;
      } else if (enr.discount_type === 'PERCENTAGE') {
        const pct = parseFloat(enr.discount_value || 0);
        expectedFee = Math.max(0, monthlyFee - (monthlyFee * pct / 100));
      } else if (enr.discount_type === 'FIXED_AMOUNT') {
        const disc = parseFloat(enr.discount_value || 0);
        expectedFee = Math.max(0, monthlyFee - disc);
      } else {
        expectedFee = monthlyFee;
      }
    }
    expectedFee = Math.round(expectedFee * 100) / 100;

    // Check existing payments for this month
    const [existing] = await pool.query(`
      SELECT id, receipt_no, amount, payment_status FROM payments 
      WHERE academic_year_id = ? AND student_id = ? AND group_id = ? AND month_ref = ?
    `, [academic_year_id, student_id, group_id, month_ref]);

    if (payment_status === 'EXEMPTED') {
      const hasExemption = existing.some(e => e.payment_status === 'EXEMPTED');
      if (hasExemption) {
        return res.status(400).json({
          success: false,
          message: req.t('duplicate_receipt_error', { receipt_no: existing[0].receipt_no })
        });
      }
    } else {
      // PAID: Check if already fully settled
      const totalPaidSoFar = existing
        .filter(e => e.payment_status === 'PAID')
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

      if (existing.length > 0 && expectedFee > 0 && totalPaidSoFar >= expectedFee) {
        return res.status(400).json({
          success: false,
          message: req.t('duplicate_receipt_error', { receipt_no: existing[0].receipt_no })
        });
      }
    }

    // Generate unique receipt or exemption voucher number
    const yearShort = new Date().getFullYear().toString().slice(-2);
    const randomCode = Math.floor(10000 + Math.random() * 90000);
    const prefix = payment_status === 'EXEMPTED' ? 'EXM' : 'REC';
    const receipt_no = `${prefix}-${yearShort}-${randomCode}`;

    const finalAmount = payment_status === 'EXEMPTED' ? 0.00 : parseFloat(amount || 0.00);
    const userId = req.user?.id || null;
    const deviceId = req.deviceId || null;

    const [result] = await pool.query(`
      INSERT INTO payments (
        academic_year_id, student_id, group_id, amount, payment_date, month_ref, receipt_no, payment_status, notes, user_id, device_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      academic_year_id,
      student_id,
      group_id,
      finalAmount,
      payment_date,
      month_ref,
      receipt_no,
      payment_status,
      notes || (payment_status === 'EXEMPTED' ? 'وصل إعفاء كامل 100% معتمد' : 'دفع اشتراك شهري'),
      userId,
      deviceId
    ]);

    const [stRow] = await pool.query('SELECT full_name, reg_no FROM students WHERE id = ?', [student_id]);
    const studentName = stRow?.[0]?.full_name || '';
    const [gpRow] = await pool.query('SELECT name FROM groups WHERE id = ?', [group_id]);
    const groupName = gpRow?.[0]?.name || '';

    logActivity(req, {
      action_type: payment_status === 'EXEMPTED' ? 'EXEMPTION' : 'PAYMENT',
      data_type: 'PAYMENT',
      entity_id: result.insertId,
      entity_name: receipt_no,
      details: payment_status === 'EXEMPTED'
        ? `إصدار وصل إعفاء رقم ${receipt_no} للطالب "${studentName}" لفوج "${groupName}" لشهر ${month_ref}`
        : `تسجيل وصل دفع رقم ${receipt_no} للطالب "${studentName}" لفوج "${groupName}" لشهر ${month_ref} بمبلغ ${finalAmount} دج`
    });

    return res.status(201).json({
      success: true,
      message: req.t('payment_recorded_success'),
      data: {
        id: result.insertId,
        receipt_no,
        amount: finalAmount,
        payment_status
      }
    });
  } catch (error) {
    console.error('createPaymentOrVoucher error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// Calculate unpaid dues for a specific month
export const getUnpaidStudents = async (req, res) => {
  try {
    const { academic_year_id, month_ref } = req.query;

    if (!academic_year_id || !month_ref) {
      return res.status(400).json({ success: false, message: req.t('bad_request') });
    }

    // Query active enrollments, JOIN groups and aggregated existing payments for this month
    const [rows] = await pool.query(`
      SELECT 
        e.id AS enrollment_id,
        e.student_id,
        e.discount_type,
        e.discount_value,
        s.reg_no,
        s.full_name AS student_name,
        s.guardian_name,
        s.guardian_phone,
        g.id AS group_id,
        g.name AS group_name,
        g.track_type,
        g.is_free,
        g.monthly_fee,
        COALESCE(p.total_paid, 0) AS total_paid,
        COALESCE(p.has_exemption, 0) AS has_exemption
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN groups g ON e.group_id = g.id
      LEFT JOIN (
        SELECT 
          student_id,
          group_id,
          academic_year_id,
          month_ref,
          COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN amount ELSE 0 END), 0) AS total_paid,
          MAX(CASE WHEN payment_status = 'EXEMPTED' THEN 1 ELSE 0 END) AS has_exemption
        FROM payments
        WHERE month_ref = ? AND academic_year_id = ?
        GROUP BY student_id, group_id, academic_year_id, month_ref
      ) p ON p.student_id = e.student_id AND p.group_id = e.group_id
      WHERE e.academic_year_id = ? 
        AND e.status = 'ACTIVE'
    `, [month_ref, academic_year_id, academic_year_id]);

    const unpaidList = [];

    for (const row of rows) {
      // RULE 1: If group is_free = true, zero dues and NO unpaid alert
      if (row.is_free === 1 || row.is_free === true) {
        continue;
      }

      // RULE 2: If student is full exemption (100% scholarship) or has exemption voucher, NO unpaid alert
      if (row.discount_type === 'FULL_EXEMPTION' || row.has_exemption === 1) {
        continue;
      }

      // Calculate expected fee considering partial discounts
      let expectedFee = parseFloat(row.monthly_fee);
      if (row.discount_type === 'PERCENTAGE') {
        expectedFee = expectedFee - (expectedFee * parseFloat(row.discount_value) / 100);
      } else if (row.discount_type === 'FIXED_AMOUNT') {
        expectedFee = Math.max(0, expectedFee - parseFloat(row.discount_value));
      }
      expectedFee = Math.round(expectedFee * 100) / 100;

      const paidAmount = parseFloat(row.total_paid || 0);
      const remainingAmount = Math.max(0, expectedFee - paidAmount);

      if (remainingAmount > 0) {
        unpaidList.push({
          enrollment_id: row.enrollment_id,
          student_id: row.student_id,
          reg_no: row.reg_no,
          student_name: row.student_name,
          guardian_name: row.guardian_name,
          guardian_phone: row.guardian_phone,
          group_id: row.group_id,
          group_name: row.group_name,
          track_type: row.track_type,
          original_fee: parseFloat(row.monthly_fee),
          discount_type: row.discount_type,
          discount_value: parseFloat(row.discount_value),
          expected_amount: expectedFee,
          paid_amount: paidAmount,
          remaining_amount: remainingAmount,
          is_partial: paidAmount > 0,
          month_ref
        });
      }
    }

    return res.json({ success: true, count: unpaidList.length, data: unpaidList });
  } catch (error) {
    console.error('getUnpaidStudents error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};
