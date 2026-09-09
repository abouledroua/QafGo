import pool from '../config/db.js';
import path from 'path';
import multer from 'multer';

// In-memory cache
let cachedSettings = null;

// Multer Storage setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve('./uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const prefix = file.fieldname === 'stamp' ? 'stamp' : 'logo';
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

const normalizeSettings = (s) => {
  if (!s) return s;
  return {
    ...s,
    enable_quran_track: Boolean(s.enable_quran_track),
    enable_preschool_track: Boolean(s.enable_preschool_track),
    enable_tutoring_track: Boolean(s.enable_tutoring_track),
    auto_backup_enabled: Boolean(s.auto_backup_enabled)
  };
};

// GET /api/settings
export const getSettings = async (req, res) => {
  try {
    if (cachedSettings) {
      return res.json({ success: true, data: cachedSettings });
    }

    const [rows] = await pool.query('SELECT * FROM school_settings WHERE id = 1');
    if (rows.length === 0) {
      // Fallback
      return res.json({
        success: true,
        data: {
          school_name: 'منصة قاف غو',
          currency_symbol: 'د.ج',
          enable_quran_track: true,
          enable_preschool_track: true,
          enable_tutoring_track: true
        }
      });
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
      auto_backup_enabled ? 1 : 0,
      parseInt(late_attendance_threshold_minutes || 15, 10),
      parseInt(default_max_absences_warning || 3, 10),
      enable_quran_track ? 1 : 0,
      enable_preschool_track ? 1 : 0,
      enable_tutoring_track ? 1 : 0
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

    const fileUrl = `/uploads/${req.file.filename}`;
    return res.json({
      success: true,
      message: req.t('upload_success'),
      url: fileUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('uploadAssets error:', error);
    return res.status(500).json({ success: false, message: req.t('upload_failed') });
  }
};
