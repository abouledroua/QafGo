import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const ensureDefaultAdminUser = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        role ENUM('ADMIN', 'TEACHER', 'SUPERVISOR') DEFAULT 'ADMIN',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const [rows] = await pool.query('SELECT id FROM users LIMIT 1');
    if (rows.length === 0) {
      console.log('users table is empty. Automatically adding default administrator (admin / admin)...');
      const salt = await bcrypt.genSalt(10);
      const adminHash = await bcrypt.hash('admin', salt);
      await pool.query(
        'INSERT INTO users (id, username, password_hash, full_name, role) VALUES (1, ?, ?, ?, ?)',
        ['admin', adminHash, 'المدير العام للمنصة', 'ADMIN']
      );
      console.log('Default administrator user (admin / admin) created successfully.');
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

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
      process.env.JWT_SECRET || 'qafgo_super_secure_jwt_secret_key_2026',
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: req.t('auth_login_success'),
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const getMe = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, full_name, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: req.t('not_found') });
    }
    return res.json({ success: true, user: rows[0] });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

