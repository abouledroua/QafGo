import pool from '../config/db.js';

export async function migrateCashTransactionsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`cash_transactions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`academic_year_id\` INT NULL,
        \`type\` ENUM('ALIMENTATION', 'RETRAIT') NOT NULL,
        \`amount\` DECIMAL(12,2) NOT NULL,
        \`category\` VARCHAR(100) NOT NULL DEFAULT 'OTHER',
        \`beneficiary_or_source\` VARCHAR(150) NULL,
        \`transaction_date\` DATE NOT NULL,
        \`transaction_time\` TIME NULL,
        \`receipt_no\` VARCHAR(50) UNIQUE NOT NULL,
        \`payment_method\` VARCHAR(50) DEFAULT 'CASH',
        \`notes\` TEXT NULL,
        \`user_id\` INT NULL,
        \`device_id\` INT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (\`academic_year_id\`),
        INDEX (\`type\`),
        INDEX (\`category\`),
        INDEX (\`transaction_date\`),
        FOREIGN KEY (\`academic_year_id\`) REFERENCES \`academic_years\`(\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_cash_trans_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_cash_trans_device\` FOREIGN KEY (\`device_id\`) REFERENCES \`devices\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('[BACKEND] ✓ Table `cash_transactions` verified/created successfully.');
  } catch (error) {
    console.error('[BACKEND] Error creating/verifying `cash_transactions` table:', error);
  }
}
