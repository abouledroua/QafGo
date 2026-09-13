import pool from '../config/db.js';

export async function migrateRefundsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`refunds\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`academic_year_id\` INT NOT NULL,
        \`student_id\` INT NOT NULL,
        \`group_id\` INT NOT NULL,
        \`enrollment_id\` INT NULL,
        \`amount\` DECIMAL(10,2) NOT NULL,
        \`refund_date\` DATE NOT NULL,
        \`month_ref\` VARCHAR(20) NOT NULL,
        \`receipt_no\` VARCHAR(50) UNIQUE NOT NULL,
        \`notes\` TEXT NULL,
        \`user_id\` INT NULL,
        \`device_id\` INT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (\`academic_year_id\`),
        INDEX (\`student_id\`),
        INDEX (\`group_id\`),
        INDEX (\`month_ref\`),
        FOREIGN KEY (\`academic_year_id\`) REFERENCES \`academic_years\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`student_id\`) REFERENCES \`students\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_refunds_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_refunds_device\` FOREIGN KEY (\`device_id\`) REFERENCES \`devices\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('[BACKEND] ✓ Table `refunds` verified/created successfully.');
  } catch (error) {
    console.error('[BACKEND] Error creating/verifying `refunds` table:', error);
  }
}
