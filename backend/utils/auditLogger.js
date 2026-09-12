import pool from '../config/db.js';

/**
 * Resolves the client workstation / poste identifier and IP address
 */
export const extractPoste = (req) => {
  if (!req) return 'Unknown / Server';

  let rawIp = req.headers['x-forwarded-for']
    ? req.headers['x-forwarded-for'].split(',')[0].trim()
    : (req.socket?.remoteAddress || req.ip || '127.0.0.1');

  // Clean IP format (remove IPv6 mapped IPv4 prefix)
  if (rawIp.startsWith('::ffff:')) {
    rawIp = rawIp.replace('::ffff:', '');
  } else if (rawIp === '::1') {
    rawIp = '127.0.0.1';
  }

  const rawPoste = req.headers['x-poste-name'] || req.headers['x-workstation-id'];
  if (rawPoste && String(rawPoste).trim()) {
    let cleanPoste = String(rawPoste).trim();
    try {
      cleanPoste = decodeURIComponent(cleanPoste);
    } catch {
      // Keep as-is
    }
    return `${cleanPoste.slice(0, 80)} (${rawIp})`;
  }

  return rawIp;
};

/**
 * Records an activity/audit event into the database
 * 
 * @param {import('express').Request} req - Express request
 * @param {Object} options - Action metadata
 * @param {string} options.action_type - CREATE, UPDATE, DELETE, LOGIN, PAYMENT, TRANSFER, ATTENDANCE, EVALUATION, ROLLOVER, SETTINGS, etc.
 * @param {string} options.data_type - STUDENT, GROUP, TEACHER, PAYMENT, ATTENDANCE, EVALUATION, TRANSFER, TIMETABLE, CLASSROOM, SETTINGS, USER, ACADEMIC_YEAR, AUTH
 * @param {number|string} [options.entity_id] - Affected record ID
 * @param {string} [options.entity_name] - Name / Title / Label of affected record
 * @param {string} [options.details] - Human-readable summary of what changed
 * @param {Object} [options.user] - Override user if not in req.user
 * @param {string} [options.poste] - Override poste
 */
export const logActivity = async (req, options = {}) => {
  try {
    const action_type = options.action_type || options.actionType;
    const data_type = options.data_type || options.dataType;
    const entity_id = options.entity_id !== undefined ? options.entity_id : (options.entityId !== undefined ? options.entityId : null);
    const entity_name = options.entity_name || options.entityName || null;
    let details = options.details !== undefined ? options.details : null;
    if (details && typeof details === 'object') {
      try {
        details = JSON.stringify(details);
      } catch {
        details = String(details);
      }
    }
    const user = options.user || null;
    const poste = options.poste || null;
    const rawDeviceKey = options.device_key || options.deviceKey || req?.deviceKey || req?.headers?.['x-device-key'] || null;
    const device_key = rawDeviceKey ? String(rawDeviceKey).trim().toUpperCase().slice(0, 16) : null;
    let deviceId = options.device_id || options.deviceId || req?.deviceId || null;

    // If deviceId not directly available on req, look up by key if present
    if (!deviceId && device_key) {
      try {
        const [devRow] = await pool.query('SELECT id FROM devices WHERE device_key = ? LIMIT 1', [device_key]);
        if (devRow.length > 0) {
          deviceId = devRow[0].id;
        }
      } catch {}
    }

    const actor = user || req?.user || null;
    const resolvedPoste = poste || extractPoste(req);
    const userAgent = req?.headers?.['user-agent'] ? req.headers['user-agent'].slice(0, 255) : null;

    const userId = actor?.id || null;

    await pool.query(`
      INSERT INTO audit_logs (
        user_id,
        device_id,
        action_type,
        data_type,
        entity_id,
        entity_name,
        poste,
        device_key,
        user_agent,
        details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      deviceId,
      action_type,
      data_type,
      entity_id ? parseInt(entity_id, 10) || null : null,
      entity_name ? String(entity_name).slice(0, 255) : null,
      resolvedPoste ? String(resolvedPoste).slice(0, 150) : '127.0.0.1',
      device_key,
      userAgent,
      details ? String(details) : null
    ]);

    // Update last_seen_at for device if device_key is provided
    if (device_key) {
      pool.query(
        'UPDATE devices SET last_seen_at = CURRENT_TIMESTAMP WHERE device_key = ?',
        [device_key]
      ).catch(() => {});
    }
  } catch (error) {
    // Audit logging should never crash the main request
    console.error('Audit logActivity error:', error.message);
  }
};
