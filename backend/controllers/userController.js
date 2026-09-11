import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import { ALL_PERMISSIONS } from './authController.js';

// 1. Get All Users
export const getUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, username, full_name, role, is_active, permissions, created_at 
      FROM users 
      ORDER BY id ASC
    `);

    const users = rows.map((u) => {
      let perms = [];
      if (u.role === 'ADMIN') {
        perms = ALL_PERMISSIONS;
      } else if (u.permissions) {
        try {
          perms = typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions;
        } catch {
          perms = [];
        }
      }
      return {
        ...u,
        is_active: Boolean(u.is_active !== 0),
        permissions: Array.isArray(perms) ? perms : []
      };
    });

    return res.json({ success: true, data: users });
  } catch (error) {
    console.error('getUsers error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 2. Create User
export const createUser = async (req, res) => {
  try {
    const { username, password, full_name, role = 'SUPERVISOR', is_active = true, permissions = [] } = req.body;

    if (!username || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'يرجى ملء جميع الحقول المطلوبة (اسم المستخدم، كلمة المرور، الاسم الكامل)'
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'اسم المستخدم يجب أن يحتوي على 3 أحرف على الأقل'
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور يجب أن تحتوي على 4 أحرف على الأقل'
      });
    }

    // Check unique username
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [cleanUsername]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'اسم المستخدم هذا مسجل بالفعل، يرجى اختيار اسم آخر'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userPermissions = role === 'ADMIN' ? ALL_PERMISSIONS : (Array.isArray(permissions) ? permissions : []);

    const [result] = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, role, is_active, permissions)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cleanUsername, passwordHash, full_name.trim(), role, is_active ? 1 : 0, JSON.stringify(userPermissions)]
    );

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء حساب المستخدم بنجاح',
      data: {
        id: result.insertId,
        username: cleanUsername,
        full_name: full_name.trim(),
        role,
        is_active: Boolean(is_active),
        permissions: userPermissions
      }
    });
  } catch (error) {
    console.error('createUser error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 3. Update User (profile, role, permissions, status)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, role, is_active, permissions } = req.body;

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: req.t('not_found') });
    }

    const targetUser = rows[0];

    // Protect primary admin from demotion or deactivation
    if (targetUser.username === 'admin') {
      if (role && role !== 'ADMIN') {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن تغيير دور حساب المدير العام الرئيسي (admin)'
        });
      }
      if (is_active === false || is_active === 0) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن تعطيل حساب المدير العام الرئيسي (admin)'
        });
      }
    }

    const updatedFullName = full_name !== undefined ? full_name.trim() : targetUser.full_name;
    const updatedRole = role !== undefined ? role : targetUser.role;
    const updatedActive = is_active !== undefined ? (is_active ? 1 : 0) : targetUser.is_active;

    let updatedPermissions = permissions !== undefined ? permissions : [];
    if (updatedRole === 'ADMIN') {
      updatedPermissions = ALL_PERMISSIONS;
    } else if (!Array.isArray(updatedPermissions)) {
      updatedPermissions = [];
    }

    await pool.query(
      `UPDATE users 
       SET full_name = ?, role = ?, is_active = ?, permissions = ?
       WHERE id = ?`,
      [updatedFullName, updatedRole, updatedActive, JSON.stringify(updatedPermissions), id]
    );

    return res.json({
      success: true,
      message: 'تم تحديث بيانات وصلاحيات المستخدم بنجاح',
      data: {
        id: Number(id),
        username: targetUser.username,
        full_name: updatedFullName,
        role: updatedRole,
        is_active: Boolean(updatedActive !== 0),
        permissions: updatedPermissions
      }
    });
  } catch (error) {
    console.error('updateUser error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 4. Reset User Password
export const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الجديدة يجب أن تحتوي على 4 أحرف على الأقل'
      });
    }

    const [rows] = await pool.query('SELECT id, username FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: req.t('not_found') });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(new_password, salt);

    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);

    return res.json({
      success: true,
      message: `تم إعادة تعيين كلمة المرور للمستخدم (${rows[0].username}) بنجاح`
    });
  } catch (error) {
    console.error('resetUserPassword error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 5. Delete User
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Disallow deleting currently logged in user
    if (Number(req.user.id) === Number(id)) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكنك حذف حسابك الحالي أثناء تسجيل الدخول به'
      });
    }

    const [rows] = await pool.query('SELECT id, username FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: req.t('not_found') });
    }

    if (rows[0].username === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'لا يمكن حذف حساب المدير العام الرئيسي للنظام'
      });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: `تم حذف المستخدم (${rows[0].username}) بنجاح`
    });
  } catch (error) {
    console.error('deleteUser error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};
