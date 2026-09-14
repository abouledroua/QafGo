import pool from '../config/db.js';

export const migrateBackupSettingsColumns = async () => {
  try {
    const columnsToAdd = [
      { name: 'backup_folder_path', definition: 'VARCHAR(500) NULL' },
      { name: 'backup_interval', definition: "VARCHAR(50) NOT NULL DEFAULT '1_day'" },
      { name: 'last_backup_at', definition: 'DATETIME NULL' },
      { name: 'last_backup_status', definition: 'VARCHAR(50) NULL' },
      { name: 'last_backup_file', definition: 'VARCHAR(500) NULL' },
      { name: 'last_backup_error', definition: 'TEXT NULL' }
    ];

    for (const col of columnsToAdd) {
      const [existing] = await pool.query(
        `SHOW COLUMNS FROM school_settings LIKE ?`,
        [col.name]
      );
      if (existing.length === 0) {
        console.log(`Adding column "${col.name}" to school_settings...`);
        await pool.query(
          `ALTER TABLE school_settings ADD COLUMN \`${col.name}\` ${col.definition}`
        );
      }
    }
  } catch (error) {
    console.error('migrateBackupSettingsColumns error:', error);
  }
};
