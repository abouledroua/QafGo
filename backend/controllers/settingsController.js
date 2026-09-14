import pool from '../config/db.js';
import { logActivity } from '../utils/auditLogger.js';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { migrateBackupSettingsColumns } from '../database/addBackupSettingsColumns.js';
import { generateDatabaseDumpSql } from '../utils/databaseDumper.js';
import { runManualBackup, reloadScheduler, getSchedulerStatus } from '../services/backupScheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadBaseDir = path.resolve(__dirname, '..', 'uploads');

export const resolveUploadFolder = (rawType) => {
  if (!rawType) return 'general';
  const t = String(rawType).toLowerCase().trim();
  if (t.includes('student')) return 'students';
  if (t.includes('teacher')) return 'teachers';
  if (t.includes('logo')) return 'logos';
  if (t.includes('stamp')) return 'stamps';
  const sanitized = t.replace(/[^a-z0-9_-]/g, '');
  return sanitized || 'general';
};

// Ensure base upload directory and default subdirectories exist
if (!fs.existsSync(uploadBaseDir)) {
  fs.mkdirSync(uploadBaseDir, { recursive: true });
}
['students', 'teachers', 'logos', 'stamps', 'general'].forEach((sub) => {
  const subPath = path.join(uploadBaseDir, sub);
  if (!fs.existsSync(subPath)) {
    fs.mkdirSync(subPath, { recursive: true });
  }
});

// In-memory cache
let cachedSettings = null;

// Multer Storage setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const rawType = req.query?.type || req.headers['x-upload-type'] || req.body?.type || file.fieldname;
    const folder = resolveUploadFolder(rawType);
    const targetDir = path.join(uploadBaseDir, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    req.uploadSubFolder = folder;
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const folder = req.uploadSubFolder || resolveUploadFolder(req.query?.type || req.body?.type);
    const prefix = folder.endsWith('s') ? folder.slice(0, -1) : folder;
    const uniqueName = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, uniqueName);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|svg/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      const errMsg = req.t ? req.t('settings_image_format_error') : 'الملف يجب أن يكون صورة بصيغة JPG, PNG, WEBP أو SVG';
      cb(new Error(errMsg));
    }
  }
});

const toBool = (val) => val === true || val === 1 || val === '1' || val === 'true';

const normalizeSettings = (s) => {
  if (!s) return s;
  return {
    ...s,
    group_gender_policy: s.group_gender_policy === 'SEPARATED' ? 'SEPARATED' : 'MIXED',
    enable_quran_track: toBool(s.enable_quran_track),
    enable_preschool_track: toBool(s.enable_preschool_track),
    enable_tutoring_track: toBool(s.enable_tutoring_track),
    auto_backup_enabled: toBool(s.auto_backup_enabled),
    backup_folder_path: s.backup_folder_path || '',
    backup_interval: s.backup_interval || '1_day',
    last_backup_at: s.last_backup_at || null,
    last_backup_status: s.last_backup_status || null,
    last_backup_file: s.last_backup_file || null,
    last_backup_error: s.last_backup_error || null
  };
};

export const getGroupGenderPolicy = async () => {
  try {
    if (cachedSettings && cachedSettings.group_gender_policy) {
      return cachedSettings.group_gender_policy;
    }
    const [rows] = await pool.query('SELECT group_gender_policy FROM school_settings WHERE id = 1');
    if (rows.length > 0 && rows[0].group_gender_policy) {
      return rows[0].group_gender_policy === 'SEPARATED' ? 'SEPARATED' : 'MIXED';
    }
    return 'MIXED';
  } catch (err) {
    console.error('getGroupGenderPolicy error:', err);
    return 'MIXED';
  }
};

export const ensureDefaultSettingsRow = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS school_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        school_name VARCHAR(191) NOT NULL DEFAULT 'المدرسة القرآنية والتربوية النموذجية',
        legal_registration_no VARCHAR(100) NULL DEFAULT '',
        phone_primary VARCHAR(50) NULL DEFAULT '',
        phone_secondary VARCHAR(50) NULL DEFAULT '',
        email VARCHAR(100) NULL DEFAULT '',
        address_line TEXT NULL,
        city VARCHAR(100) NULL DEFAULT '',
        state_province VARCHAR(100) NULL DEFAULT '',
        logo_url VARCHAR(255) NULL,
        stamp_signature_url VARCHAR(255) NULL,
        receipt_header_text TEXT NULL,
        receipt_footer_notes TEXT NULL,
        currency_symbol VARCHAR(20) DEFAULT 'د.ج',
        default_language VARCHAR(10) DEFAULT 'ar',
        default_theme VARCHAR(50) DEFAULT 'brown-light',
        auto_backup_enabled BOOLEAN DEFAULT FALSE,
        backup_folder_path VARCHAR(500) NULL,
        backup_interval VARCHAR(50) NOT NULL DEFAULT '1_day',
        last_backup_at DATETIME NULL,
        last_backup_status VARCHAR(50) NULL,
        last_backup_file VARCHAR(500) NULL,
        last_backup_error TEXT NULL,
        late_attendance_threshold_minutes INT DEFAULT 15,
        default_max_absences_warning INT DEFAULT 3,
        enable_quran_track BOOLEAN DEFAULT TRUE,
        enable_preschool_track BOOLEAN DEFAULT TRUE,
        enable_tutoring_track BOOLEAN DEFAULT TRUE,
        group_gender_policy ENUM('MIXED', 'SEPARATED') NOT NULL DEFAULT 'MIXED',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure columns added by later migrations exist
    await migrateBackupSettingsColumns();

    try {
      const [colGender] = await pool.query(`SHOW COLUMNS FROM school_settings LIKE 'group_gender_policy'`);
      if (colGender.length === 0) {
        await pool.query(`ALTER TABLE school_settings ADD COLUMN group_gender_policy ENUM('MIXED', 'SEPARATED') NOT NULL DEFAULT 'MIXED'`);
      }
    } catch (e) {
      console.warn('group_gender_policy column check:', e.message);
    }

    const [rows] = await pool.query('SELECT * FROM school_settings WHERE id = 1');
    if (rows.length === 0) {
      console.log('school_settings table is empty. Automatically inserting initial default row (id = 1)...');
      await pool.query(`
        INSERT INTO school_settings (
          id,
          school_name,
          legal_registration_no,
          phone_primary,
          phone_secondary,
          email,
          address_line,
          city,
          state_province,
          currency_symbol,
          default_language,
          default_theme,
          auto_backup_enabled,
          backup_folder_path,
          backup_interval,
          late_attendance_threshold_minutes,
          default_max_absences_warning,
          enable_quran_track,
          enable_preschool_track,
          enable_tutoring_track,
          group_gender_policy
        ) VALUES (
          1,
          'المدرسة القرآنية والتربوية النموذجية',
          '',
          '',
          '',
          '',
          '',
          'الجزائر العاصمة',
          'الجزائر',
          'د.ج',
          'ar',
          'brown-light',
          0,
          '',
          '1_day',
          15,
          3,
          1,
          1,
          1,
          'MIXED'
        )
      `);
      console.log('Successfully inserted initial row into school_settings.');
      const [newRows] = await pool.query('SELECT * FROM school_settings WHERE id = 1');
      return newRows[0];
    }
    return rows[0];
  } catch (err) {
    console.error('ensureDefaultSettingsRow error:', err);
    throw err;
  }
};

// GET /api/settings
export const getSettings = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM school_settings WHERE id = 1');
    if (rows.length === 0) {
      const initialRow = await ensureDefaultSettingsRow();
      cachedSettings = normalizeSettings(initialRow);
      return res.json({ success: true, data: cachedSettings });
    }

    cachedSettings = normalizeSettings(rows[0]);
    return res.json({ success: true, data: cachedSettings });
  } catch (error) {
    console.error('getSettings error:', error);
    return res.status(500).json({ success: false, message: req.t ? req.t('unhandled_server_error') : 'خطأ في الخادم' });
  }
};

// PUT /api/settings
export const updateSettings = async (req, res) => {
  try {
    await ensureDefaultSettingsRow();
    const {
      school_name,
      legal_registration_no,
      phone_primary,
      phone_secondary,
      email,
      address_line,
      city,
      state_province,
      logo_url,
      stamp_signature_url,
      receipt_header_text,
      receipt_footer_notes,
      currency_symbol,
      default_language,
      default_theme,
      auto_backup_enabled,
      backup_folder_path,
      backup_interval,
      late_attendance_threshold_minutes,
      default_max_absences_warning,
      enable_quran_track,
      enable_preschool_track,
      enable_tutoring_track,
      group_gender_policy
    } = req.body;

    if (!school_name) {
      return res.status(400).json({ success: false, message: req.t ? req.t('bad_request') : 'الاسم مطلوب' });
    }

    const validatedGenderPolicy = group_gender_policy === 'SEPARATED' ? 'SEPARATED' : 'MIXED';
    const validatedInterval = ['1_hour', '6_hours', '1_day'].includes(backup_interval) ? backup_interval : '1_day';
    const sanitizedBackupPath = typeof backup_folder_path === 'string' ? backup_folder_path.trim() : '';

    await pool.query(`
      UPDATE school_settings SET
        school_name = ?,
        legal_registration_no = ?,
        phone_primary = ?,
        phone_secondary = ?,
        email = ?,
        address_line = ?,
        city = ?,
        state_province = ?,
        logo_url = ?,
        stamp_signature_url = ?,
        receipt_header_text = ?,
        receipt_footer_notes = ?,
        currency_symbol = ?,
        default_language = ?,
        default_theme = ?,
        auto_backup_enabled = ?,
        backup_folder_path = ?,
        backup_interval = ?,
        late_attendance_threshold_minutes = ?,
        default_max_absences_warning = ?,
        enable_quran_track = ?,
        enable_preschool_track = ?,
        enable_tutoring_track = ?,
        group_gender_policy = ?
      WHERE id = 1
    `, [
      school_name,
      legal_registration_no || null,
      phone_primary || null,
      phone_secondary || null,
      email || null,
      address_line || null,
      city || null,
      state_province || null,
      logo_url || null,
      stamp_signature_url || null,
      receipt_header_text || null,
      receipt_footer_notes || null,
      currency_symbol || 'د.ج',
      default_language || 'ar',
      default_theme || 'brown-light',
      toBool(auto_backup_enabled) ? 1 : 0,
      sanitizedBackupPath,
      validatedInterval,
      parseInt(late_attendance_threshold_minutes || 15, 10),
      parseInt(default_max_absences_warning || 3, 10),
      toBool(enable_quran_track) ? 1 : 0,
      toBool(enable_preschool_track) ? 1 : 0,
      toBool(enable_tutoring_track) ? 1 : 0,
      validatedGenderPolicy
    ]);

    // Refresh cache
    const [updated] = await pool.query('SELECT * FROM school_settings WHERE id = 1');
    cachedSettings = normalizeSettings(updated[0]);

    // Trigger scheduler reload
    reloadScheduler().catch(err => {
      console.warn('[SettingsController] Scheduler reload notice:', err.message);
    });

    logActivity(req, {
      action_type: 'UPDATE',
      data_type: 'SETTINGS',
      entity_id: 1,
      entity_name: school_name,
      details: `تحديث إعدادات المنصة والنسخ الاحتياطي: "${school_name}"`
    });

    return res.json({
      success: true,
      message: req.t ? req.t('settings_saved_success') : 'تم حفظ الإعدادات بنجاح',
      data: cachedSettings
    });
  } catch (error) {
    console.error('updateSettings error:', error);
    return res.status(500).json({ success: false, message: req.t ? req.t('unhandled_server_error') : 'خطأ في الخادم' });
  }
};

// POST /api/settings/upload-assets
export const uploadAssets = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: req.t ? req.t('bad_request') : 'لم يتم تحديد ملف' });
    }

    const folder = req.uploadSubFolder || resolveUploadFolder(req.query?.type || req.body?.type);
    const fileUrl = `/uploads/${folder}/${req.file.filename}`;
    return res.json({
      success: true,
      message: req.t ? req.t('upload_success') : 'تم الرفع بنجاح',
      url: fileUrl,
      filename: req.file.filename,
      folder: folder
    });
  } catch (error) {
    console.error('uploadAssets error:', error);
    return res.status(500).json({ success: false, message: req.t ? req.t('upload_failed') : 'فشل الرفع' });
  }
};

/**
 * GET /api/settings/backup/download
 * Export full MySQL database dump as a downloadable file directly in the browser
 */
export const exportDatabaseDownload = async (req, res) => {
  try {
    const dump = await generateDatabaseDumpSql();

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}`;
    const filename = `sauvegarde_${dateStr}_${timeStr}.sql`;

    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Tables-Count', String(dump.tablesCount));

    logActivity(req, {
      action_type: 'EXPORT',
      data_type: 'SETTINGS',
      entity_id: 1,
      entity_name: 'قاعدة البيانات',
      details: `تصدير وتحميل مباشر لنسخة قاعدة البيانات (${dump.tablesCount} جدول)`
    });

    return res.send(dump.sql);
  } catch (error) {
    console.error('exportDatabaseDownload error:', error);
    return res.status(500).json({
      success: false,
      message: req.t ? req.t('settings.backup_download_error', 'فشل تصدير قاعدة البيانات') : 'فشل تصدير قاعدة البيانات',
      error: error.message
    });
  }
};

/**
 * POST /api/settings/backup/run-now
 * Immediately trigger manual backup to the configured folder
 */
export const runBackupNow = async (req, res) => {
  try {
    const result = await runManualBackup(req);
    return res.json({
      success: true,
      message: req.t ? req.t('settings.backup_run_success', 'تم حفظ النسخة الاحتياطية بنجاح في المجلد المحدد') : 'تم حفظ النسخة الاحتياطية بنجاح في المجلد المحدد',
      result
    });
  } catch (error) {
    console.error('runBackupNow error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || (req.t ? req.t('settings.backup_run_error', 'فشل إجراء النسخ الاحتياطي') : 'فشل إجراء النسخ الاحتياطي')
    });
  }
};

/**
 * POST /api/settings/backup/verify-folder
 * Test and verify that destination folder path is accessible and writable
 */
export const verifyBackupFolder = async (req, res) => {
  try {
    const { folderPath } = req.body;
    if (!folderPath || typeof folderPath !== 'string' || !folderPath.trim()) {
      return res.status(400).json({
        success: false,
        message: req.t ? req.t('settings.enter_folder_first', 'يرجى إدخال مسار المجلد للتحقق منه') : 'يرجى إدخال مسار المجلد للتحقق منه'
      });
    }

    const cleanPath = path.resolve(folderPath.trim());

    // Create directory if not exists
    if (!fs.existsSync(cleanPath)) {
      fs.mkdirSync(cleanPath, { recursive: true });
    }

    // Test write permission with a temp test file
    const testFile = path.join(cleanPath, `.qafgo_test_${Date.now()}.tmp`);
    fs.writeFileSync(testFile, 'test_write', 'utf8');
    fs.unlinkSync(testFile);

    return res.json({
      success: true,
      valid: true,
      writable: true,
      resolvedPath: cleanPath,
      message: req.t ? req.t('settings.folder_valid_success', 'المجلد صالح وجاهز لحفظ النسخ الاحتياطية') : 'المجلد صالح وجاهز لحفظ النسخ الاحتياطية'
    });
  } catch (error) {
    console.error('verifyBackupFolder error:', error);
    const prefix = req.t ? req.t('settings.folder_invalid_error', 'المسار المحدد غير صالح أو غير متاح للكتابة') : 'المسار المحدد غير صالح أو غير متاح للكتابة';
    return res.status(400).json({
      success: false,
      valid: false,
      writable: false,
      message: `${prefix}: ${error.message}`
    });
  }
};

/**
 * GET /api/settings/backup/status
 * Get the current scheduler status, last backup info, and next scheduled run
 */
export const getBackupStatus = async (req, res) => {
  try {
    const status = await getSchedulerStatus();
    return res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('getBackupStatus error:', error);
    return res.status(500).json({
      success: false,
      message: req.t ? req.t('settings.backup_status_error', 'فشل استرجاع حالة النسخ الاحتياطي') : 'فشل استرجاع حالة النسخ الاحتياطي',
      error: error.message
    });
  }
};

/**
 * GET /api/settings/backup/explore-directory
 * Explore directories on the server/host machine for folder selection
 */
export const exploreDirectories = async (req, res) => {
  try {
    let targetPath = req.query.path ? String(req.query.path).trim() : '';

    if (!targetPath) {
      targetPath = os.homedir() || process.cwd();
    }

    targetPath = path.resolve(targetPath);

    if (!fs.existsSync(targetPath)) {
      targetPath = os.homedir() || process.cwd();
    }

    // Detect system drives (Windows)
    const drives = [];
    if (process.platform === 'win32') {
      for (let i = 65; i <= 90; i++) {
        const drive = `${String.fromCharCode(i)}:\\`;
        try {
          fs.accessSync(drive, fs.constants.R_OK);
          drives.push(drive);
        } catch (_) {}
      }
    } else {
      drives.push('/');
    }

    // Read subdirectories
    let dirEntries = [];
    try {
      const rawEntries = fs.readdirSync(targetPath, { withFileTypes: true });
      dirEntries = rawEntries
        .filter((entry) => {
          if (!entry.isDirectory()) return false;
          const name = entry.name;
          if (
            name.startsWith('$') || 
            name.startsWith('.') || 
            name === 'System Volume Information' || 
            name === 'node_modules' ||
            name === 'Recovery'
          ) {
            return false;
          }
          return true;
        })
        .map((entry) => {
          const full = path.join(targetPath, entry.name);
          let isWritable = false;
          try {
            fs.accessSync(full, fs.constants.W_OK);
            isWritable = true;
          } catch (_) {}
          return {
            name: entry.name,
            path: full,
            isWritable
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    } catch (err) {
      console.warn(`Cannot read directory ${targetPath}:`, err.message);
    }

    // Check if targetPath itself is writable
    let targetWritable = false;
    try {
      fs.accessSync(targetPath, fs.constants.W_OK);
      targetWritable = true;
    } catch (_) {}

    // Breadcrumbs computation
    const parts = targetPath.split(path.sep).filter(Boolean);
    const breadcrumbs = [];
    let accumulated = '';
    if (process.platform === 'win32') {
      const rootMatch = targetPath.match(/^[a-zA-Z]:\\?/);
      const driveRoot = rootMatch ? rootMatch[0].toUpperCase() : '';
      accumulated = driveRoot.endsWith('\\') ? driveRoot : driveRoot + '\\';
      breadcrumbs.push({ name: driveRoot.replace(/\\$/, ''), path: accumulated });
      if (parts.length > 0 && parts[0].includes(':')) {
        parts.shift();
      }
    } else {
      accumulated = '/';
      breadcrumbs.push({ name: '/', path: '/' });
    }

    for (const part of parts) {
      accumulated = path.join(accumulated, part);
      breadcrumbs.push({ name: part, path: accumulated });
    }

    // Parent path
    const parentPath = path.dirname(targetPath) !== targetPath ? path.dirname(targetPath) : null;

    // Standard Quick Shortcuts
    const home = os.homedir();
    const shortcuts = [
      { id: 'home', label: 'المجلد الشخصي (Home)', path: home },
      { id: 'desktop', label: 'سطح المكتب (Desktop)', path: path.join(home, 'Desktop') },
      { id: 'documents', label: 'المستندات (Documents)', path: path.join(home, 'Documents') },
      { id: 'app', label: 'مجلد التطبيق (QafGo)', path: process.cwd() }
    ].filter((s) => fs.existsSync(s.path));

    return res.json({
      success: true,
      currentPath: targetPath,
      parentPath,
      drives,
      breadcrumbs,
      directories: dirEntries,
      shortcuts,
      isWritable: targetWritable
    });
  } catch (error) {
    console.error('exploreDirectories error:', error);
    return res.status(500).json({
      success: false,
      message: req.t ? req.t('settings.folder_explore_error', 'فشل استكشاف المجلدات') : 'فشل استكشاف المجلدات',
      error: error.message
    });
  }
};

/**
 * POST /api/settings/backup/create-directory
 * Create a new folder on the host machine
 */
export const createBackupDirectory = async (req, res) => {
  try {
    const { parentPath, folderName } = req.body;
    if (!parentPath || !folderName) {
      return res.status(400).json({
        success: false,
        message: req.t ? req.t('settings.folder_specify_parent', 'يرجى تحديد المجلد الأصلي واسم المجلد الجديد') : 'يرجى تحديد المجلد الأصلي واسم المجلد الجديد'
      });
    }

    const sanitizedName = String(folderName).replace(/[<>:"/\\|?*]/g, '').trim();
    if (!sanitizedName) {
      return res.status(400).json({
        success: false,
        message: req.t ? req.t('settings.folder_invalid_chars', 'اسم المجلد يحتوي على رموز غير صالحة') : 'اسم المجلد يحتوي على رموز غير صالحة'
      });
    }

    const newPath = path.join(path.resolve(parentPath), sanitizedName);
    if (!fs.existsSync(newPath)) {
      fs.mkdirSync(newPath, { recursive: true });
    }

    return res.json({
      success: true,
      message: req.t ? req.t('settings.folder_created_success', 'تم إنشاء المجلد بنجاح') : 'تم إنشاء المجلد بنجاح',
      createdPath: newPath
    });
  } catch (error) {
    console.error('createBackupDirectory error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || (req.t ? req.t('settings.folder_picker_create_error', 'فشل إنشاء المجلد') : 'فشل إنشاء المجلد')
    });
  }
};


