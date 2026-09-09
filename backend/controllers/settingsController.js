import pool from '../config/db.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';

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
    enable_quran_track: toBool(s.enable_quran_track),
    enable_preschool_track: toBool(s.enable_preschool_track),
    enable_tutoring_track: toBool(s.enable_tutoring_track),
    auto_backup_enabled: toBool(s.auto_backup_enabled)
  };
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
        late_attendance_threshold_minutes INT DEFAULT 15,
        default_max_absences_warning INT DEFAULT 3,
        enable_quran_track BOOLEAN DEFAULT TRUE,
        enable_preschool_track BOOLEAN DEFAULT TRUE,
        enable_tutoring_track BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

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
          late_attendance_threshold_minutes,
          default_max_absences_warning,
          enable_quran_track,
          enable_preschool_track,
          enable_tutoring_track
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
          15,
          3,
          1,
          1,
          1
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
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
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
      late_attendance_threshold_minutes,
      default_max_absences_warning,
      enable_quran_track,
      enable_preschool_track,
      enable_tutoring_track
    } = req.body;

    if (!school_name) {
      return res.status(400).json({ success: false, message: req.t('bad_request') });
    }

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
        late_attendance_threshold_minutes = ?,
        default_max_absences_warning = ?,
        enable_quran_track = ?,
        enable_preschool_track = ?,
        enable_tutoring_track = ?
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
      parseInt(late_attendance_threshold_minutes || 15, 10),
      parseInt(default_max_absences_warning || 3, 10),
      toBool(enable_quran_track) ? 1 : 0,
      toBool(enable_preschool_track) ? 1 : 0,
      toBool(enable_tutoring_track) ? 1 : 0
    ]);

    // Refresh cache
    const [updated] = await pool.query('SELECT * FROM school_settings WHERE id = 1');
    cachedSettings = normalizeSettings(updated[0]);

    return res.json({
      success: true,
      message: req.t('settings_saved_success'),
      data: cachedSettings
    });
  } catch (error) {
    console.error('updateSettings error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// POST /api/settings/upload-assets
export const uploadAssets = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: req.t('bad_request') });
    }

    const folder = req.uploadSubFolder || resolveUploadFolder(req.query?.type || req.body?.type);
    const fileUrl = `/uploads/${folder}/${req.file.filename}`;
    return res.json({
      success: true,
      message: req.t('upload_success'),
      url: fileUrl,
      filename: req.file.filename,
      folder: folder
    });
  } catch (error) {
    console.error('uploadAssets error:', error);
    return res.status(500).json({ success: false, message: req.t('upload_failed') });
  }
};
