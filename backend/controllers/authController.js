import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logActivity } from '../utils/auditLogger.js';

export const ALL_PERMISSIONS = [
  'dashboard',
  'students',
  'transfers',
  'tracks',
  'timetable',
  'teachers',
  'finance',
  'rollover',
  'settings',
  'users'
];

export const ensureDefaultAdminUser = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        role VARCHAR(50) DEFAULT 'ADMIN',
        is_active TINYINT(1) DEFAULT 1,
        permissions JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      const [colActive] = await pool.query(`SHOW COLUMNS FROM users LIKE 'is_active'`);
      if (colActive.length === 0) {
        await pool.query(`ALTER TABLE users ADD COLUMN is_active TINYINT(1) DEFAULT 1`);
      }
    } catch (e) {
      console.warn('is_active column check:', e.message);
    }

    try {
      const [colPerms] = await pool.query(`SHOW COLUMNS FROM users LIKE 'permissions'`);
      if (colPerms.length === 0) {
        await pool.query(`ALTER TABLE users ADD COLUMN permissions JSON NULL`);
      }
    } catch (e) {
      console.warn('permissions column check:', e.message);
    }

    try {
      const [colGenderAcc] = await pool.query(`SHOW COLUMNS FROM users LIKE 'gender_access'`);
      if (colGenderAcc.length === 0) {
        await pool.query(`ALTER TABLE users ADD COLUMN gender_access ENUM('ALL', 'MALE', 'FEMALE') NOT NULL DEFAULT 'ALL'`);
      }
    } catch (e) {
      console.warn('gender_access column check:', e.message);
    }

    try {
      await pool.query(`ALTER TABLE users MODIFY COLUMN role VARCHAR(50) DEFAULT 'ADMIN'`);
    } catch (e) {
      // ignore
    }

    const [rows] = await pool.query('SELECT id FROM users LIMIT 1');
    if (rows.length === 0) {
      console.log('users table is empty. Automatically adding default administrator (admin / admin)...');
      const salt = await bcrypt.genSalt(10);
      const adminHash = await bcrypt.hash('admin', salt);
      await pool.query(
        'INSERT INTO users (id, username, password_hash, full_name, role, is_active, permissions, gender_access) VALUES (1, ?, ?, ?, ?, 1, ?, ?)',
        ['admin', adminHash, 'المدير العام للمنصة', 'ADMIN', JSON.stringify(ALL_PERMISSIONS), 'ALL']
      );
      console.log('Default administrator user (admin / admin) created successfully.');
    } else {
      // Ensure admin user has full permissions and full gender access
      await pool.query(
        `UPDATE users SET permissions = ?, is_active = 1, gender_access = 'ALL' WHERE username = 'admin' AND (permissions IS NULL OR permissions = 'null' OR gender_access IS NULL)`,
        [JSON.stringify(ALL_PERMISSIONS)]
      );
    }
  } catch (error) {
    console.error('ensureDefaultAdminUser error:', error);
    throw error;
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: req.t('auth_missing_fields') });
    }

    let [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      const [allUsers] = await pool.query('SELECT id FROM users LIMIT 1');
      if (allUsers.length === 0) {
        await ensureDefaultAdminUser();
        [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
      }
    }

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: req.t('auth_invalid_credentials') });
    }

    const user = rows[0];

    // Check if account is active
    if (user.is_active === 0 || user.is_active === false) {
      return res.status(403).json({
        success: false,
        message: 'تم تعطيل هذا الحساب مؤقتاً. يرجى التواصل مع إدارة المنصة.'
      });
    }

    let isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch && user.username === 'admin' && (password === 'admin' || password === 'admin123')) {
      const isMatchAdmin = await bcrypt.compare('admin', user.password_hash);
      const isMatchAdmin123 = await bcrypt.compare('admin123', user.password_hash);
      if (isMatchAdmin || isMatchAdmin123) {
        isMatch = true;
      }
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: req.t('auth_invalid_credentials') });
    }

    let permissions = [];
    if (user.role === 'ADMIN') {
      permissions = ALL_PERMISSIONS;
    } else if (user.permissions) {
      try {
        permissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
      } catch {
        permissions = [];
      }
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        permissions,
        gender_access: user.gender_access || 'ALL'
      },
      process.env.JWT_SECRET || 'qafgo_super_secure_jwt_secret_key_2026',
      { expiresIn: '7d' }
    );

    logActivity(req, {
      action_type: 'LOGIN',
      data_type: 'AUTH',
      entity_id: user.id,
      entity_name: user.full_name,
      details: `تسجيل دخول ناجح للمستخدم: ${user.full_name} (${user.username})`,
      user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role }
    });

    return res.json({
      success: true,
      message: req.t('auth_login_success'),
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        is_active: Boolean(user.is_active !== 0),
        permissions,
        gender_access: user.gender_access || 'ALL'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const getMe = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, full_name, role, is_active, permissions, gender_access, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: req.t('not_found') });
    }
    const user = rows[0];
    let permissions = [];
    if (user.role === 'ADMIN') {
      permissions = ALL_PERMISSIONS;
    } else if (user.permissions) {
      try {
        permissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
      } catch {
        permissions = [];
      }
    }

    return res.json({
      success: true,
      user: {
        ...user,
        is_active: Boolean(user.is_active !== 0),
        permissions,
        gender_access: user.gender_access || 'ALL'
      }
    });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

