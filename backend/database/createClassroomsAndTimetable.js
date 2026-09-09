import pool from '../config/db.js';

async function migrate() {
  try {
    console.log('--- Creating classrooms and timetable_sessions tables ---');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS classrooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NULL,
        capacity INT DEFAULT 25,
        type ENUM('GENERAL', 'HALAQA', 'PRESCHOOL', 'LAB', 'LIBRARY') DEFAULT 'GENERAL',
        equipment TEXT NULL,
        status ENUM('AVAILABLE', 'MAINTENANCE', 'INACTIVE') DEFAULT 'AVAILABLE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Table `classrooms` verified/created.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS timetable_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        academic_year_id INT NOT NULL,
        group_id INT NOT NULL,
        classroom_id INT NULL,
        teacher_id INT NULL,
        day_of_week ENUM('SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY') NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        notes VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_academic_year (academic_year_id),
        INDEX idx_group (group_id),
        INDEX idx_classroom (classroom_id),
        INDEX idx_teacher (teacher_id),
        INDEX idx_day_time (day_of_week, start_time, end_time),
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE SET NULL,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Table `timetable_sessions` verified/created.');

    // Seed initial classrooms if table is empty
    const [existingClassrooms] = await pool.query('SELECT COUNT(*) as count FROM classrooms');
    if (existingClassrooms[0].count === 0) {
      await pool.query(`
        INSERT INTO classrooms (name, code, capacity, type, equipment, status) VALUES
        ('قاعة الإتقان القرآنية', 'Q-01', 25, 'HALAQA', 'سجاد ووسائد مريحة، مكتب ومصحف ترتيل كبير، مكيف هوائي', 'AVAILABLE'),
        ('قاعة براعم الإيمان (تحضيري)', 'P-01', 20, 'PRESCHOOL', 'طاولات ملونة، ألعاب تعليمية ومجسمات، شاشة تلفاز تفاعلية', 'AVAILABLE'),
        ('قاعة ابن باديس للدعم العلمي', 'T-01', 30, 'GENERAL', 'سبورة بيضاء كبيرة، عارض ضوئي (Data Show)، مكيف', 'AVAILABLE'),
        ('مخبر وتكنولوجيا الإعلام الآلي', 'LAB-01', 15, 'LAB', '15 جهاز حاسوب، شبكة محلية، جهاز عرض ضوئي', 'AVAILABLE');
      `);
      console.log('✓ Seeded 4 initial classrooms.');
    }

    console.log('--- Migration completed successfully ---');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
