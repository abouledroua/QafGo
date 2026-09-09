import pool from '../config/db.js';

async function migrateGroupStatus() {
  try {
    console.log('Checking groups table columns...');
    const [columns] = await pool.query(`SHOW COLUMNS FROM \`groups\` LIKE 'status'`);

    if (columns.length === 0) {
      console.log('Adding status column to groups table...');
      await pool.query(`
        ALTER TABLE \`groups\`
        ADD COLUMN \`status\` ENUM('PENDING', 'ACTIVE', 'STOPPED', 'ARCHIVED') NOT NULL DEFAULT 'PENDING'
        AFTER \`monthly_fee\`,
        ADD INDEX (\`status\`)
      `);
      console.log('Status column added successfully.');

      // Set existing groups to ACTIVE if they were created before
      console.log('Updating existing groups to ACTIVE...');
      await pool.query(`UPDATE \`groups\` SET \`status\` = 'ACTIVE' WHERE \`status\` = 'PENDING'`);
      console.log('Existing groups set to ACTIVE.');
    } else {
      console.log('Status column already exists in groups table.');
    }

    console.log('Migration finished successfully.');
  } catch (error) {
    console.error('Error in migrateGroupStatus:', error);
  } finally {
    process.exit(0);
  }
}

migrateGroupStatus();
