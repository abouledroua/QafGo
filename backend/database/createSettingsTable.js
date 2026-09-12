import pool from '../config/db.js';

async function setupSettingsTable() {
  console.log('Creating school_settings table if not exists...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS school_settings (
      id INT PRIMARY KEY AUTO_INCREMENT,
      -- School Institutional Profile
      school_name VARCHAR(191) NOT NULL DEFAULT 'المدرسة القرآنية والتربوية النموذجية',
      legal_registration_no VARCHAR(100) NULL DEFAULT 'W-16/2024-QAF',
      phone_primary VARCHAR(50) NULL DEFAULT '0550 12 34 56',
      phone_secondary VARCHAR(50) NULL DEFAULT '023 45 67 89',
      email VARCHAR(100) NULL DEFAULT 'contact@qafgo-school.dz',
      address_line TEXT NULL,
      city VARCHAR(100) NULL DEFAULT 'الجزائر العاصمة',
      state_province VARCHAR(100) NULL DEFAULT 'الجزائر',
      logo_url VARCHAR(255) NULL,
      stamp_signature_url VARCHAR(255) NULL,
      receipt_header_text TEXT NULL,
      receipt_footer_notes TEXT NULL,
      
      -- Application & Operational Settings
      currency_symbol VARCHAR(20) DEFAULT 'د.ج',
      default_language VARCHAR(10) DEFAULT 'ar',
      default_theme VARCHAR(50) DEFAULT 'brown-light',
      auto_backup_enabled BOOLEAN DEFAULT FALSE,
      late_attendance_threshold_minutes INT DEFAULT 15,
      default_max_absences_warning INT DEFAULT 3,
      
      -- Module Visibility Toggles
      enable_quran_track BOOLEAN DEFAULT TRUE,
      enable_preschool_track BOOLEAN DEFAULT TRUE,
      enable_tutoring_track BOOLEAN DEFAULT TRUE,
      
      -- Operational Policies
      group_gender_policy ENUM('MIXED', 'SEPARATED') NOT NULL DEFAULT 'MIXED',
      
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Check if singleton row exists
  const [rows] = await pool.query('SELECT id FROM school_settings WHERE id = 1');
  if (rows.length === 0) {
    console.log('Seeding initial singleton settings row...');
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
        receipt_header_text,
        receipt_footer_notes,
        currency_symbol,
        default_theme,
        enable_quran_track,
        enable_preschool_track,
        enable_tutoring_track
      ) VALUES (
        1,
        'مدرسة النور والفرقان القرآنية والتعليمية',
        'اعتماد وزاري رقم: 2024/0984-QAF',
        '0550 12 34 56',
        '023 45 67 89',
        'contact@qafgo-school.dz',
        'حي النور، شارع الإمام مالك، المقاطعة الإدارية الأولى',
        'الجزائر العاصمة',
        'الجزائر',
        'الجمهورية الجزائرية الديمقراطية الشعبية - وزارة الشؤون الدينية والأوقاف',
        'يرجى الاحتفاظ بهذا الوصل كسند إثبات رسمي. الاشتراكات غير قابلة للاسترداد بعد انقضاء الشهر المرجعي.',
        'د.ج',
        'sky-blue',
        TRUE,
        TRUE,
        TRUE
      )
    `);
    console.log('Seeded settings row 1 successfully!');
  } else {
    console.log('Settings row 1 already exists.');
  }

  process.exit(0);
}

setupSettingsTable().catch(err => {
  console.error('Failed to setup settings table:', err);
  process.exit(1);
});
