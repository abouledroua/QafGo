import pool from '../config/db.js';
import { logActivity, extractPoste } from '../utils/auditLogger.js';

/**
 * Check if a device_key is registered in `devices` table
 */
export const checkDevice = async (req, res) => {
  try {
    const rawKey = req.params.key || req.query.key;
    if (!rawKey) {
      return res.status(400).json({ success: false, message: 'مفتاح الجهاز مطلوب' });
    }

    const deviceKey = String(rawKey).trim().toUpperCase();

    const [rows] = await pool.query(
      'SELECT id, device_key, device_name, status, last_seen_at FROM devices WHERE device_key = ? LIMIT 1',
      [deviceKey]
    );

    if (rows.length > 0) {
      const device = rows[0];
      // Update last seen
      pool.query(
        'UPDATE devices SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?',
        [device.id]
      ).catch(() => {});

      return res.json({
        success: true,
        exists: true,
        device
      });
    }

    return res.json({
      success: true,
      exists: false
    });
  } catch (error) {
    console.error('checkDevice error:', error);
    return res.status(500).json({ success: false, message: 'فشل التحقق من الجهاز', error: error.message });
  }
};

/**
 * Cross-browser lookup: attempts to find device by hardware fingerprint & IP
 */
export const lookupDevice = async (req, res) => {
  try {
    const { fingerprint } = req.query;
    if (!fingerprint || !String(fingerprint).trim()) {
      return res.json({ success: true, found: false });
    }

    const cleanFingerprint = String(fingerprint).trim();

    // Look for existing active device with this hardware fingerprint
    const [rows] = await pool.query(
      'SELECT id, device_key, device_name, status, last_seen_at FROM devices WHERE fingerprint = ? AND status = "ACTIVE" ORDER BY last_seen_at DESC LIMIT 1',
      [cleanFingerprint]
    );

    if (rows.length > 0) {
      const device = rows[0];
      pool.query(
        'UPDATE devices SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?',
        [device.id]
      ).catch(() => {});

      return res.json({
        success: true,
        found: true,
        device
      });
    }

    return res.json({
      success: true,
      found: false
    });
  } catch (error) {
    console.error('lookupDevice error:', error);
    return res.status(500).json({ success: false, message: 'فشل استعلام البصمة', error: error.message });
  }
};

/**
 * Register a new device or claim a device key
 */
export const registerDevice = async (req, res) => {
  try {
    const { device_key, device_name, fingerprint } = req.body;

    if (!device_key || !String(device_key).trim()) {
      return res.status(400).json({ success: false, message: 'مفتاح الجهاز مطلوب' });
    }
    if (!device_name || !String(device_name).trim()) {
      return res.status(400).json({ success: false, message: 'اسم الجهاز أو محطة العمل إلزامي' });
    }

    const cleanKey = String(device_key).trim().toUpperCase();
    const cleanName = String(device_name).trim().slice(0, 150);
    const cleanFingerprint = fingerprint ? String(fingerprint).trim().slice(0, 255) : null;
    const clientIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    const userId = req.user?.id || null;

    // Validate key format: 5 to 8 uppercase letters & numbers
    const keyRegex = /^[A-Z0-9]{5,8}$/;
    if (!keyRegex.test(cleanKey)) {
      return res.status(400).json({
        success: false,
        message: 'مفتاح الجهاز يجب أن يتكون من 5 إلى 8 أحرف وأرقام إنجليزية كبيرة فقط'
      });
    }

    // Check if device_key already exists
    const [existing] = await pool.query(
      'SELECT * FROM devices WHERE device_key = ? LIMIT 1',
      [cleanKey]
    );

    let deviceId;
    if (existing.length > 0) {
      // If already registered, update name & fingerprint
      deviceId = existing[0].id;
      await pool.query(
        'UPDATE devices SET device_name = ?, fingerprint = COALESCE(?, fingerprint), ip_address = ?, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?',
        [cleanName, cleanFingerprint, clientIp, deviceId]
      );
    } else {
      // Insert new device
      const [insertResult] = await pool.query(
        'INSERT INTO devices (device_key, device_name, fingerprint, ip_address, created_by_user_id) VALUES (?, ?, ?, ?, ?)',
        [cleanKey, cleanName, cleanFingerprint, clientIp, userId]
      );
      deviceId = insertResult.insertId;
    }

    // Log this action in audit_logs
    logActivity(req, {
      action_type: 'CREATE',
      data_type: 'DEVICE',
      entity_id: deviceId,
      entity_name: cleanName,
      device_key: cleanKey,
      details: `تسجيل محطة عمل / جهاز جديد: ${cleanName} بالمفتاح (${cleanKey})`
    });

    return res.status(201).json({
      success: true,
      message: 'تم تسجيل محطة العمل بنجاح',
      device: {
        id: deviceId,
        device_key: cleanKey,
        device_name: cleanName
      }
    });
  } catch (error) {
    console.error('registerDevice error:', error);
    return res.status(500).json({ success: false, message: 'فشل تسجيل الجهاز', error: error.message });
  }
};

/**
 * List all registered devices (ADMIN only)
 */
export const getDevices = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        d.id,
        d.device_key,
        d.device_name,
        d.fingerprint,
        d.ip_address,
        d.status,
        d.last_seen_at,
        d.created_at,
        u.username AS created_by_username,
        u.full_name AS created_by_name
      FROM devices d
      LEFT JOIN users u ON d.created_by_user_id = u.id
      ORDER BY d.last_seen_at DESC, d.id DESC
    `);

    return res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('getDevices error:', error);
    return res.status(500).json({ success: false, message: 'فشل استرجاع قائمة الأجهزة', error: error.message });
  }
};
