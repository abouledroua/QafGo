import pool from '../config/db.js';

export const getDashboardStats = async (req, res) => {
  try {
    let { academic_year_id } = req.query;

    // Fallback to active or latest academic year if not provided
    if (!academic_year_id) {
      const [currentYear] = await pool.query(`SELECT id FROM academic_years WHERE is_current = 1 LIMIT 1`);
      if (currentYear.length > 0) {
        academic_year_id = currentYear[0].id;
      } else {
        const [latestYear] = await pool.query(`SELECT id FROM academic_years ORDER BY id DESC LIMIT 1`);
        if (latestYear.length > 0) {
          academic_year_id = latestYear[0].id;
        }
      }
    }

    if (!academic_year_id) {
      return res.json({
        success: true,
        data: {
          summary: { total_students: 0, total_groups: 0, total_teachers: 0, total_transfers: 0 },
          trackBreakdown: [],
          recentTahfiz: [],
          recentTransfers: [],
          finances: { total_revenue: 0, total_exemptions: 0 }
        }
      });
    }

    // 1. Total counts
    const [totalStats] = await pool.query(`
      SELECT 
        (
          SELECT COUNT(DISTINCT s.id) 
          FROM students s
          LEFT JOIN enrollments e ON s.id = e.student_id
          WHERE (e.academic_year_id = ? AND e.status = 'ACTIVE')
             OR (e.academic_year_id IS NULL)
        ) AS total_students,
        (SELECT COUNT(*) FROM groups g WHERE g.academic_year_id = ?) AS total_groups,
        (SELECT COUNT(*) FROM teachers) AS total_teachers,
        (SELECT COUNT(*) FROM transfers_log tl WHERE tl.academic_year_id = ?) AS total_transfers
    `, [academic_year_id, academic_year_id, academic_year_id]);

    // 2. Breakdown by track (Halaqat, PreSchool, Tutoring)
    const [trackBreakdown] = await pool.query(`
      SELECT 
        g.track_type,
        COUNT(DISTINCT g.id) AS groups_count,
        COUNT(DISTINCT CASE WHEN e.status = 'ACTIVE' THEN e.student_id END) AS active_students_count
      FROM groups g
      LEFT JOIN enrollments e ON e.group_id = g.id AND e.academic_year_id = ?
      WHERE g.academic_year_id = ?
      GROUP BY g.track_type
    `, [academic_year_id, academic_year_id]);

    // 3. Recent evaluations/activity
    const [recentTahfiz] = await pool.query(`
      SELECT tl.id, tl.date, tl.type, tl.surah_from, tl.surah_to, tl.grade, s.full_name AS student_name, g.name AS group_name
      FROM tahfiz_logs tl
      JOIN enrollments e ON tl.enrollment_id = e.id
      JOIN students s ON e.student_id = s.id
      JOIN groups g ON e.group_id = g.id
      WHERE e.academic_year_id = ?
      ORDER BY tl.date DESC LIMIT 5
    `, [academic_year_id]);

    const [recentTransfers] = await pool.query(`
      SELECT tl.id, tl.transfer_date, tl.reason, s.full_name AS student_name, fg.name AS from_group, tg.name AS to_group
      FROM transfers_log tl
      JOIN students s ON tl.student_id = s.id
      JOIN groups fg ON tl.from_group_id = fg.id
      JOIN groups tg ON tl.to_group_id = tg.id
      WHERE tl.academic_year_id = ?
      ORDER BY tl.transfer_date DESC LIMIT 5
    `, [academic_year_id]);

    // 4. Financial quick numbers
    const [finances] = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN amount ELSE 0 END), 0) AS total_revenue,
        COUNT(CASE WHEN payment_status = 'EXEMPTED' THEN 1 END) AS total_exemptions
      FROM payments
      WHERE academic_year_id = ?
    `, [academic_year_id]);

    return res.json({
      success: true,
      data: {
        summary: totalStats[0],
        trackBreakdown,
        recentTahfiz,
        recentTransfers,
        finances: finances[0]
      }
    });

  } catch (error) {
    console.error('getDashboardStats error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

