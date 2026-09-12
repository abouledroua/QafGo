import pool from '../config/db.js';

const tables = [
  'audit_logs',
  'payments',
  'preschool_logs',
  'tahfiz_logs',
  'teacher_attendance',
  'timetable_sessions',
  'transfers_log',
  'tutoring_grades'
];

async function migrate() {
  console.log('--- Starting Migration: Add user_id and device_id to 8 Core Tables ---');

  for (const table of tables) {
    console.log(`\nChecking table: \`${table}\`...`);

    // Get current columns
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [table]);
    const colNames = cols.map(c => c.COLUMN_NAME);

    // 1. user_id
    if (!colNames.includes('user_id')) {
      console.log(`  Adding column \`user_id\` to \`${table}\`...`);
      await pool.query(`
        ALTER TABLE \`${table}\` 
        ADD COLUMN \`user_id\` INT NULL,
        ADD INDEX (\`user_id\`)
      `);
      console.log(`  ✓ Column \`user_id\` added to \`${table}\`.`);
    } else {
      console.log(`  - \`user_id\` already present in \`${table}\`.`);
    }

    // Add user_id FK if not present
    const [userFk] = await pool.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ? 
        AND COLUMN_NAME = 'user_id' 
        AND REFERENCED_TABLE_NAME = 'users'
    `, [table]);

    if (userFk.length === 0) {
      try {
        console.log(`  Adding FK constraint for user_id in \`${table}\`...`);
        await pool.query(`
          ALTER TABLE \`${table}\` 
          ADD CONSTRAINT \`fk_${table}_user\` 
          FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
        `);
        console.log(`  ✓ FK constraint \`fk_${table}_user\` added.`);
      } catch (e) {
        console.warn(`  ! Could not add FK fk_${table}_user:`, e.message);
      }
    }

    // 2. device_id
    if (!colNames.includes('device_id')) {
      console.log(`  Adding column \`device_id\` to \`${table}\`...`);
      await pool.query(`
        ALTER TABLE \`${table}\` 
        ADD COLUMN \`device_id\` INT NULL,
        ADD INDEX (\`device_id\`)
      `);
      console.log(`  ✓ Column \`device_id\` added to \`${table}\`.`);
    } else {
      console.log(`  - \`device_id\` already present in \`${table}\`.`);
    }

    // Add device_id FK if not present
    const [devFk] = await pool.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ? 
        AND COLUMN_NAME = 'device_id' 
        AND REFERENCED_TABLE_NAME = 'devices'
    `, [table]);

    if (devFk.length === 0) {
      try {
        console.log(`  Adding FK constraint for device_id in \`${table}\`...`);
        await pool.query(`
          ALTER TABLE \`${table}\` 
          ADD CONSTRAINT \`fk_${table}_device\` 
          FOREIGN KEY (\`device_id\`) REFERENCES \`devices\`(\`id\`) ON DELETE SET NULL
        `);
        console.log(`  ✓ FK constraint \`fk_${table}_device\` added.`);
      } catch (e) {
        console.warn(`  ! Could not add FK fk_${table}_device:`, e.message);
      }
    }
  }

  console.log('\n--- Migration Completed Successfully for all 8 tables! ---');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
