import pool from '../config/db.js';

/**
 * Get paginated and filtered audit logs
 */
export const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      date,
      start_date,
      end_date,
      period,
      user_id,
      action_type,
      data_type,
      poste,
      search
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(10, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    let whereClause = ' WHERE 1=1';
    const params = [];

    // 1. Period & Date filters
    if (date) {
      whereClause += ' AND DATE(l.created_at) = ?';
      params.push(date);
    } else if (start_date && end_date) {
      whereClause += ' AND DATE(l.created_at) >= ? AND DATE(l.created_at) <= ?';
      params.push(start_date, end_date);
    } else if (start_date) {
      whereClause += ' AND DATE(l.created_at) >= ?';
      params.push(start_date);
    } else if (end_date) {
      whereClause += ' AND DATE(l.created_at) <= ?';
      params.push(end_date);
    } else if (period) {
      if (period === 'today') {
        whereClause += ' AND DATE(l.created_at) = CURRENT_DATE()';
      } else if (period === 'yesterday') {
        whereClause += ' AND DATE(l.created_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)';
      } else if (period === 'this_week') {
        whereClause += ' AND l.created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL WEEKDAY(CURRENT_DATE()) DAY)';
      } else if (period === 'this_month') {
        whereClause += ' AND l.created_at >= DATE_FORMAT(CURRENT_DATE(), "%Y-%m-01")';
      }
    }

    // 2. User filter
    if (user_id) {
      whereClause += ' AND l.user_id = ?';
      params.push(user_id);
    }

    // 3. Action type filter
    if (action_type && action_type !== 'ALL') {
      whereClause += ' AND l.action_type = ?';
      params.push(action_type);
    }

    // 4. Data type filter
    if (data_type && data_type !== 'ALL') {
      whereClause += ' AND l.data_type = ?';
      params.push(data_type);
    }

    // 5. Poste / Workstation / Device Key filter
    if (poste && poste !== 'ALL') {
      whereClause += ' AND (l.poste LIKE ? OR l.device_key LIKE ?)';
      params.push(`%${poste}%`, `%${poste}%`);
    }

    // 6. Search keyword
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereClause += ' AND (l.details LIKE ? OR l.entity_name LIKE ? OR u.username LIKE ? OR u.full_name LIKE ? OR l.poste LIKE ? OR l.device_key LIKE ?)';
      params.push(term, term, term, term, term, term);
    }

    // Query total count
    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total FROM audit_logs l LEFT JOIN users u ON l.user_id = u.id ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Query data
    const query = `
      SELECT 
        l.id,
        l.created_at,
        l.user_id,
        COALESCE(u.username, 'SYSTEM') AS username,
        COALESCE(u.full_name, 'نظام المنصة الآلي') AS user_full_name,
        COALESCE(u.role, 'SYSTEM') AS user_role,
        l.action_type,
        l.data_type,
        l.entity_id,
        l.entity_name,
        l.poste,
        l.device_key,
        l.user_agent,
        l.details
      FROM audit_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ${whereClause}
      ORDER BY l.created_at DESC, l.id DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(query, [...params, limitNum, offset]);

    // Query KPI Overview statistics
    const [statsResult] = await pool.query(`
      SELECT 
        COUNT(*) AS total_logs,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE() THEN 1 END) AS today_logs,
        COUNT(DISTINCT user_id) AS total_users,
        COUNT(DISTINCT poste) AS total_postes
      FROM audit_logs
    `);

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      },
      stats: statsResult[0]
    });
  } catch (error) {
    console.error('getAuditLogs error:', error);
    return res.status(500).json({ success: false, message: 'فشل استرجاع سجل العمليات', error: error.message });
  }
};

/**
 * Get distinct filter options (users, action types, data types, postes)
 */
export const getAuditLogFilterOptions = async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT DISTINCT u.id, u.username, u.full_name, u.role 
      FROM users u
      JOIN audit_logs l ON l.user_id = u.id
      ORDER BY u.full_name ASC
    `);

    const [actionTypes] = await pool.query(`
      SELECT DISTINCT action_type 
      FROM audit_logs 
      ORDER BY action_type ASC
    `);

    const [dataTypes] = await pool.query(`
      SELECT DISTINCT data_type 
      FROM audit_logs 
      ORDER BY data_type ASC
    `);

    const [postes] = await pool.query(`
      SELECT DISTINCT poste 
      FROM audit_logs 
      ORDER BY poste ASC
    `);

    return res.json({
      success: true,
      data: {
        users: users,
        actionTypes: actionTypes.map(r => r.action_type),
        dataTypes: dataTypes.map(r => r.data_type),
        postes: postes.map(r => r.poste)
      }
    });
  } catch (error) {
    console.error('getAuditLogFilterOptions error:', error);
    return res.status(500).json({ success: false, message: 'فشل استرجاع خيارات التصفية', error: error.message });
  }
};

/**
 * Export audit logs for report generation
 */
export const exportAuditLogs = async (req, res) => {
  try {
    const {
      date,
      start_date,
      end_date,
      period,
      user_id,
      action_type,
      data_type,
      poste,
      search,
      limit = 1000
    } = req.query;

    let whereClause = ' WHERE 1=1';
    const params = [];

    if (date) {
      whereClause += ' AND DATE(l.created_at) = ?';
      params.push(date);
    } else if (start_date && end_date) {
      whereClause += ' AND DATE(l.created_at) >= ? AND DATE(l.created_at) <= ?';
      params.push(start_date, end_date);
    } else if (period) {
      if (period === 'today') {
        whereClause += ' AND DATE(l.created_at) = CURRENT_DATE()';
      } else if (period === 'yesterday') {
        whereClause += ' AND DATE(l.created_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)';
      } else if (period === 'this_week') {
        whereClause += ' AND l.created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL WEEKDAY(CURRENT_DATE()) DAY)';
      } else if (period === 'this_month') {
        whereClause += ' AND l.created_at >= DATE_FORMAT(CURRENT_DATE(), "%Y-%m-01")';
      }
    }

    if (user_id) {
      whereClause += ' AND l.user_id = ?';
      params.push(user_id);
    }

    if (action_type && action_type !== 'ALL') {
      whereClause += ' AND l.action_type = ?';
      params.push(action_type);
    }

    if (data_type && data_type !== 'ALL') {
      whereClause += ' AND l.data_type = ?';
      params.push(data_type);
    }

    if (poste && poste !== 'ALL') {
      whereClause += ' AND (l.poste LIKE ? OR l.device_key LIKE ?)';
      params.push(`%${poste}%`, `%${poste}%`);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereClause += ' AND (l.details LIKE ? OR l.entity_name LIKE ? OR u.username LIKE ? OR u.full_name LIKE ? OR l.poste LIKE ? OR l.device_key LIKE ?)';
      params.push(term, term, term, term, term, term);
    }

    const [rows] = await pool.query(`
      SELECT 
        l.id,
        l.created_at,
        l.user_id,
        COALESCE(u.username, 'SYSTEM') AS username,
        COALESCE(u.full_name, 'نظام المنصة الآلي') AS user_full_name,
        COALESCE(u.role, 'SYSTEM') AS user_role,
        l.action_type,
        l.data_type,
        l.entity_name,
        l.poste,
        l.device_key,
        l.details
      FROM audit_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ${whereClause}
      ORDER BY l.created_at DESC, l.id DESC
      LIMIT ?
    `, [...params, parseInt(limit, 10) || 1000]);

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('exportAuditLogs error:', error);
    return res.status(500).json({ success: false, message: 'فشل تصدير سجل العمليات', error: error.message });
  }
};
