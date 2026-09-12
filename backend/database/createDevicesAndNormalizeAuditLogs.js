import pool from '../config/db.js';

async function migrate() {
  console.log('--- Starting Devices & Audit Logs Normalization Migration ---');

  // 1. Create `devices` table
  console.log('Creating `devices` table if not exists...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`devices\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`device_key\` VARCHAR(16) UNIQUE NOT NULL,
      \`device_name\` VARCHAR(150) NOT NULL,
      \`fingerprint\` VARCHAR(255) NULL,
      \`ip_address\` VARCHAR(45) NULL,
      \`created_by_user_id\` INT NULL,
      \`status\` ENUM('ACTIVE', 'BLOCKED') DEFAULT 'ACTIVE',
      \`last_seen_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (\`device_key\`),
      INDEX (\`fingerprint\`),
      CONSTRAINT \`fk_devices_user\` FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✓ `devices` table created/verified successfully.');

  // 2. Check existing columns of `audit_logs`
  console.log('Inspecting `audit_logs` table columns...');
  const [cols] = await pool.query(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs'
  `);
  const colNames = cols.map(c => c.COLUMN_NAME);

  // Drop redundant user columns as requested
  if (colNames.includes('username')) {
    console.log('Dropping `username` column from `audit_logs`...');
    await pool.query('ALTER TABLE `audit_logs` DROP COLUMN `username`');
  }
  if (colNames.includes('user_full_name')) {
    console.log('Dropping `user_full_name` column from `audit_logs`...');
    await pool.query('ALTER TABLE `audit_logs` DROP COLUMN `user_full_name`');
  }
  if (colNames.includes('user_role')) {
    console.log('Dropping `user_role` column from `audit_logs`...');
    await pool.query('ALTER TABLE `audit_logs` DROP COLUMN `user_role`');
  }

  // Add `device_key` column if not present
  if (!colNames.includes('device_key')) {
    console.log('Adding `device_key` column to `audit_logs`...');
    await pool.query('ALTER TABLE `audit_logs` ADD COLUMN `device_key` VARCHAR(16) NULL AFTER `poste`, ADD INDEX (`device_key`)');
  }

  // Add foreign key constraint for user_id if not present
  const [fkChecks] = await pool.query(`
    SELECT CONSTRAINT_NAME 
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'audit_logs' 
      AND COLUMN_NAME = 'user_id' 
      AND REFERENCED_TABLE_NAME = 'users'
  `);
  if (fkChecks.length === 0) {
    try {
      console.log('Adding FOREIGN KEY fk_audit_logs_user to `audit_logs`...');
      await pool.query(`
        ALTER TABLE \`audit_logs\` 
        ADD CONSTRAINT \`fk_audit_logs_user\` 
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      `);
    } catch (fkErr) {
      console.warn('Note on FK constraint addition:', fkErr.message);
    }
  }

  console.log('✓ `audit_logs` table successfully normalized!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
