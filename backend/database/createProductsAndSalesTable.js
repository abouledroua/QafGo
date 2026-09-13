import pool from '../config/db.js';

export async function migrateProductsAndSalesTable() {
  try {
    console.log('--- Initializing Products, Sales, and Product Debt Tables ---');

    // 1. Products Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        designation VARCHAR(150) NOT NULL,
        qte INT NOT NULL DEFAULT 0,
        prix_achat DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        prix_vente DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_designation (designation)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Table `products` verified/created.');

    // 2. Product Sales Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        academic_year_id INT NULL,
        student_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        remaining_debt DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        sale_date DATE NOT NULL,
        receipt_no VARCHAR(50) UNIQUE NOT NULL,
        status ENUM('PAID', 'PARTIAL', 'UNPAID') NOT NULL DEFAULT 'UNPAID',
        notes TEXT NULL,
        user_id INT NULL,
        device_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sale_student (student_id),
        INDEX idx_sale_product (product_id),
        INDEX idx_sale_status (status),
        INDEX idx_sale_date (sale_date),
        INDEX idx_sale_debt (remaining_debt),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
        CONSTRAINT fk_sale_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_sale_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Table `product_sales` verified/created.');

    // 3. Product Sale Payments Table (for recording subsequent debt payment installments)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_sale_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sale_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_date DATE NOT NULL,
        receipt_no VARCHAR(50) UNIQUE NOT NULL,
        notes TEXT NULL,
        user_id INT NULL,
        device_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pay_sale (sale_id),
        INDEX idx_pay_date (payment_date),
        FOREIGN KEY (sale_id) REFERENCES product_sales(id) ON DELETE CASCADE,
        CONSTRAINT fk_salepay_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_salepay_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Table `product_sale_payments` verified/created.');

    // Seed some initial school products if empty
    const [existing] = await pool.query('SELECT COUNT(*) as count FROM products');
    if (existing[0].count === 0) {
      await pool.query(`
        INSERT INTO products (designation, qte, prix_achat, prix_vente) VALUES
        ('مصحف التجويد والترتيل الملون', 35, 450.00, 650.00),
        ('كراس المتابعة والحفظ القرآني', 60, 120.00, 200.00),
        ('محفظة وحقيبة المدرسة القرآنية', 25, 800.00, 1200.00),
        ('كتاب القاعدة النورانية وتجويد الحروف', 40, 250.00, 350.00),
        ('زي طالب المدرسة (قميص وشاشية)', 20, 1100.00, 1600.00)
      `);
      console.log('✓ Seeded 5 initial educational products.');
    }

    console.log('✓ Product and sales migration finished successfully.');
  } catch (err) {
    console.error('Error in migrateProductsAndSalesTable:', err);
    throw err;
  }
}

// Allow direct CLI execution if run directly
if (process.argv[1]?.endsWith('createProductsAndSalesTable.js')) {
  migrateProductsAndSalesTable()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
