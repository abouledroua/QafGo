import pool from '../config/db.js';

async function createAuditLogsTable() {
  try {
    console.log('Creating audit_logs table if not exists...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`audit_logs\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`user_id\` INT NULL,
        \`username\` VARCHAR(100) NULL,
        \`user_full_name\` VARCHAR(150) NULL,
        \`user_role\` VARCHAR(50) NULL,
        \`action_type\` VARCHAR(50) NOT NULL,
        \`data_type\` VARCHAR(100) NOT NULL,
        \`entity_id\` INT NULL,
        \`entity_name\` VARCHAR(255) NULL,
        \`poste\` VARCHAR(150) NOT NULL,
        \`user_agent\` VARCHAR(255) NULL,
        \`details\` TEXT NULL,
        INDEX (\`created_at\`),
        INDEX (\`user_id\`),
        INDEX (\`action_type\`),
        INDEX (\`data_type\`),
        INDEX (\`poste\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('audit_logs table created or already exists.');
  } catch (error) {
    console.error('Error in createAuditLogsTable:', error);
  } finally {
    process.exit(0);
  }
}

createAuditLogsTable();
