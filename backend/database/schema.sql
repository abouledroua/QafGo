CREATE DATABASE IF NOT EXISTS `qafgo_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `qafgo_db`;

-- 1. Academic Years (السنوات الدراسية)
CREATE TABLE IF NOT EXISTS `academic_years` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `label` VARCHAR(50) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `is_current` BOOLEAN DEFAULT FALSE,
  `is_locked` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Users (المستخدمون وإدارة النظام)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `role` ENUM('ADMIN', 'TEACHER', 'SUPERVISOR') DEFAULT 'ADMIN',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Teachers & Sheikhs (المشايخ والأساتذة)
CREATE TABLE IF NOT EXISTS `teachers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(50),
  `email` VARCHAR(100),
  `specialty` VARCHAR(100),
  `track_type` VARCHAR(150) DEFAULT 'GENERAL',
  `photo_url` VARCHAR(255) NULL,
  `bio` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Students (سجل الطلبة)
CREATE TABLE IF NOT EXISTS `students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `reg_no` VARCHAR(50) UNIQUE NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `dob` DATE,
  `gender` ENUM('MALE', 'FEMALE') DEFAULT 'MALE',
  `academic_level` VARCHAR(100),
  `guardian_name` VARCHAR(150),
  `guardian_phone` VARCHAR(50),
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Groups & Circles (الأفواج والحلقات)
CREATE TABLE IF NOT EXISTS `groups` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `academic_year_id` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `track_type` ENUM('HALAQA', 'PRESCHOOL', 'TUTORING') NOT NULL,
  `subject_name` VARCHAR(100),
  `teacher_id` INT NULL,
  `room` VARCHAR(100),
  `schedule` VARCHAR(255),
  `is_free` BOOLEAN DEFAULT FALSE,
  `monthly_fee` DECIMAL(10,2) DEFAULT 0.00,
  `status` ENUM('PENDING', 'ACTIVE', 'STOPPED', 'ARCHIVED') NOT NULL DEFAULT 'PENDING',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (`academic_year_id`),
  INDEX (`track_type`),
  INDEX (`status`),
  FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Enrollments (تسجيلات الطلبة بالأفواج)
CREATE TABLE IF NOT EXISTS `enrollments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `academic_year_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `group_id` INT NOT NULL,
  `enrolled_at` DATE NOT NULL,
  `ended_at` DATE NULL,
  `status` ENUM('ACTIVE', 'TRANSFERRED', 'DROPPED', 'COMPLETED') DEFAULT 'ACTIVE',
  `discount_type` ENUM('NONE', 'FULL_EXEMPTION', 'PERCENTAGE', 'FIXED_AMOUNT') DEFAULT 'NONE',
  `discount_value` DECIMAL(10,2) DEFAULT 0.00,
  `transfer_reason` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (`academic_year_id`),
  INDEX (`student_id`),
  INDEX (`group_id`),
  INDEX (`status`),
  FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Transfers Log (سجل التحويلات الفورية الذرية)
CREATE TABLE IF NOT EXISTS `transfers_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `academic_year_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `from_group_id` INT NOT NULL,
  `to_group_id` INT NOT NULL,
  `transfer_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `reason` TEXT NOT NULL,
  `created_by` VARCHAR(100) DEFAULT 'إدارة المنصة',
  INDEX (`academic_year_id`),
  INDEX (`student_id`),
  FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`from_group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`to_group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tahfiz Logs (المسار القرآني - الحفظ والمراجعة)
CREATE TABLE IF NOT EXISTS `tahfiz_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `enrollment_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `type` ENUM('MEMORIZATION', 'REVISION') DEFAULT 'MEMORIZATION',
  `surah_from` VARCHAR(100),
  `ayah_from` INT,
  `surah_to` VARCHAR(100),
  `ayah_to` INT,
  `hizb_from` DECIMAL(4,1),
  `hizb_to` DECIMAL(4,1),
  `grade` ENUM('MUMTAZ', 'JAYYID_JIDDAN', 'JAYYID', 'MAQBOOL', 'IADAH') DEFAULT 'MUMTAZ',
  `notes` TEXT,
  INDEX (`enrollment_id`),
  INDEX (`date`),
  FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. PreSchool Logs (التعليم المبكر والتحضيري)
CREATE TABLE IF NOT EXISTS `preschool_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `enrollment_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `skill_category` ENUM('LETTERS', 'NUMBERS', 'MOTOR_SKILLS', 'BEHAVIOR', 'SOCIAL') NOT NULL,
  `activity_title` VARCHAR(150),
  `score_rating` ENUM('EXCELLENT', 'VERY_GOOD', 'GOOD', 'NEEDS_IMPROVEMENT') NOT NULL,
  `behavior_note` TEXT,
  INDEX (`enrollment_id`),
  INDEX (`date`),
  FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Tutoring Grades (دروس الدعم والتقوية)
CREATE TABLE IF NOT EXISTS `tutoring_grades` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `enrollment_id` INT NOT NULL,
  `exam_title` VARCHAR(150) NOT NULL,
  `score` DECIMAL(5,2) NOT NULL,
  `max_score` DECIMAL(5,2) DEFAULT 20.00,
  `exam_date` DATE NOT NULL,
  `teacher_notes` TEXT,
  INDEX (`enrollment_id`),
  INDEX (`exam_date`),
  FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Attendance (الحضور والغياب)
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `enrollment_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `status` ENUM('PRESENT', 'EXCUSED', 'UNEXCUSED', 'LATE') DEFAULT 'PRESENT',
  `notes` VARCHAR(255),
  INDEX (`enrollment_id`),
  INDEX (`date`),
  FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Teacher Attendance & Substitution (حضور وغياب واستخلاف الأساتذة والمشايخ)
CREATE TABLE IF NOT EXISTS `teacher_attendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `teacher_id` INT NOT NULL,
  `group_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `status` ENUM('PRESENT', 'ABSENT', 'EXCUSED', 'LATE') DEFAULT 'PRESENT',
  `substitute_teacher_id` INT NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (`teacher_id`),
  INDEX (`group_id`),
  INDEX (`date`),
  UNIQUE KEY `unique_teacher_session` (`teacher_id`, `group_id`, `date`),
  FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`substitute_teacher_id`) REFERENCES `teachers`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Payments & Exemption Vouchers (المالية والاشتراكات)
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `academic_year_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `group_id` INT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `payment_date` DATE NOT NULL,
  `month_ref` VARCHAR(20) NOT NULL,
  `receipt_no` VARCHAR(50) UNIQUE NOT NULL,
  `payment_status` ENUM('PAID', 'EXEMPTED') DEFAULT 'PAID',
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (`academic_year_id`),
  INDEX (`student_id`),
  INDEX (`group_id`),
  INDEX (`month_ref`),
  FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Classrooms & Rooms (قاعات وفصول المدرسة)
CREATE TABLE IF NOT EXISTS `classrooms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NULL,
  `capacity` INT DEFAULT 25,
  `type` ENUM('GENERAL', 'HALAQA', 'PRESCHOOL', 'LAB', 'LIBRARY') DEFAULT 'GENERAL',
  `equipment` TEXT NULL,
  `status` ENUM('AVAILABLE', 'MAINTENANCE', 'INACTIVE') DEFAULT 'AVAILABLE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Weekly Timetable Sessions (جدول التوقيت الأسبوعي والحصص)
CREATE TABLE IF NOT EXISTS `timetable_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `academic_year_id` INT NOT NULL,
  `group_id` INT NOT NULL,
  `classroom_id` INT NULL,
  `teacher_id` INT NULL,
  `day_of_week` ENUM('SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY') NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `notes` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (`academic_year_id`),
  INDEX (`group_id`),
  INDEX (`classroom_id`),
  INDEX (`teacher_id`),
  INDEX (`day_of_week`, `start_time`, `end_time`),
  FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`classroom_id`) REFERENCES `classrooms`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
