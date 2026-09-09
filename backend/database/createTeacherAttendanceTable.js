import pool from '../config/db.js';

async function createTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teacher_attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        teacher_id INT NOT NULL,
        group_id INT NOT NULL,
        date DATE NOT NULL,
        status ENUM('PRESENT', 'ABSENT', 'EXCUSED', 'LATE') DEFAULT 'PRESENT',
        substitute_teacher_id INT NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_teacher_session (teacher_id, group_id, date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('teacher_attendance table created successfully');
  } catch (error) {
    console.error('Error creating teacher_attendance table:', error);
  } finally {
    process.exit(0);
  }
}

createTable();
