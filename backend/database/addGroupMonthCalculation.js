import pool from '../config/db.js';

async function migrateGroupMonthCalculation() {
  try {
    console.log('Checking groups table columns for month calculation type...');
    const [columns] = await pool.query(`SHOW COLUMNS FROM \`groups\` LIKE 'month_calculation_type'`);

    if (columns.length === 0) {
      console.log('Adding month_calculation_type and package_quota columns to groups table...');
      await pool.query(`
        ALTER TABLE \`groups\`
        ADD COLUMN \`month_calculation_type\` ENUM('CALENDAR_MONTH', 'PER_SESSION', 'PER_HOUR') NOT NULL DEFAULT 'CALENDAR_MONTH'
        AFTER \`monthly_fee\`,
        ADD COLUMN \`package_quota\` INT NULL DEFAULT NULL
        AFTER \`month_calculation_type\`,
        ADD INDEX (\`month_calculation_type\`)
      `);
      console.log('Columns added successfully.');
    } else {
      console.log('month_calculation_type column already exists in groups table.');
    }

    // Check package_quota
    const [quotaCols] = await pool.query(`SHOW COLUMNS FROM \`groups\` LIKE 'package_quota'`);
    if (quotaCols.length === 0) {
      console.log('Adding package_quota column...');
      await pool.query(`
        ALTER TABLE \`groups\`
        ADD COLUMN \`package_quota\` INT NULL DEFAULT NULL
        AFTER \`month_calculation_type\`
      `);
      console.log('package_quota column added successfully.');
    }

    console.log('Month calculation migration finished successfully.');
  } catch (error) {
    console.error('Error in migrateGroupMonthCalculation:', error);
  } finally {
    process.exit(0);
  }
}

migrateGroupMonthCalculation();
