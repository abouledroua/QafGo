import pool from '../config/db.js';

export async function migrateGroupGenderAndUserAccess() {
  try {
    console.log('--- Checking & applying group gender policy and user accessibility migrations ---');

    // 1. Check school_settings table for group_gender_policy
    const [settingsCols] = await pool.query(`SHOW COLUMNS FROM \`school_settings\` LIKE 'group_gender_policy'`);
    if (settingsCols.length === 0) {
      console.log('Adding group_gender_policy column to school_settings...');
      await pool.query(`
        ALTER TABLE \`school_settings\`
        ADD COLUMN \`group_gender_policy\` ENUM('MIXED', 'SEPARATED') NOT NULL DEFAULT 'MIXED'
        AFTER \`enable_tutoring_track\`
      `);
      console.log('group_gender_policy column added successfully.');
    } else {
      console.log('group_gender_policy column already exists in school_settings.');
    }

    // 2. Check groups table for gender column
    const [groupCols] = await pool.query(`SHOW COLUMNS FROM \`groups\` LIKE 'gender'`);
    if (groupCols.length === 0) {
      console.log('Adding gender column to groups table...');
      await pool.query(`
        ALTER TABLE \`groups\`
        ADD COLUMN \`gender\` ENUM('MALE', 'FEMALE', 'ALL') NOT NULL DEFAULT 'ALL'
        AFTER \`subject_name\`,
        ADD INDEX (\`gender\`)
      `);
      console.log('gender column added to groups table successfully.');
    } else {
      console.log('gender column already exists in groups table.');
    }

    // 3. Check users table for gender_access column
    const [userCols] = await pool.query(`SHOW COLUMNS FROM \`users\` LIKE 'gender_access'`);
    if (userCols.length === 0) {
      console.log('Adding gender_access column to users table...');
      await pool.query(`
        ALTER TABLE \`users\`
        ADD COLUMN \`gender_access\` ENUM('ALL', 'MALE', 'FEMALE') NOT NULL DEFAULT 'ALL'
        AFTER \`permissions\`,
        ADD INDEX (\`gender_access\`)
      `);
      console.log('gender_access column added to users table successfully.');
    } else {
      console.log('gender_access column already exists in users table.');
    }

    console.log('Migration completed successfully!');
    return true;
  } catch (error) {
    console.error('Error in migrateGroupGenderAndUserAccess:', error);
    throw error;
  }
}

// Allow standalone execution
if (process.argv[1] && process.argv[1].endsWith('addGroupGenderAndUserAccess.js')) {
  migrateGroupGenderAndUserAccess()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
