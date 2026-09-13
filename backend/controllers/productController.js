import pool from '../config/db.js';
import { logActivity } from '../utils/auditLogger.js';

// 1. Get all products with inventory statistics
export const getProducts = async (req, res) => {
  try {
    const { search, stock_status } = req.query;

    let query = `
      SELECT 
        p.*,
        COALESCE(sales_summary.total_sold, 0) AS total_sold_quantity,
        COALESCE(sales_summary.total_revenue, 0.00) AS total_sales_revenue
      FROM products p
      LEFT JOIN (
        SELECT product_id, SUM(quantity) AS total_sold, SUM(paid_amount) AS total_revenue
        FROM product_sales
        GROUP BY product_id
      ) sales_summary ON p.id = sales_summary.product_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND p.designation LIKE ?`;
      params.push(`%${search.trim()}%`);
    }

    if (stock_status === 'OUT_OF_STOCK') {
      query += ` AND p.qte <= 0`;
    } else if (stock_status === 'LOW_STOCK') {
      query += ` AND p.qte > 0 AND p.qte <= 5`;
    } else if (stock_status === 'IN_STOCK') {
      query += ` AND p.qte > 5`;
    }

    query += ` ORDER BY p.created_at DESC`;

    const [products] = await pool.query(query, params);

    // Calculate inventory stats
    const [statsRows] = await pool.query(`
      SELECT 
        COUNT(*) AS total_products,
        COALESCE(SUM(qte), 0) AS total_stock_items,
        COALESCE(SUM(CASE WHEN qte <= 0 THEN 1 ELSE 0 END), 0) AS out_of_stock_count,
        COALESCE(SUM(CASE WHEN qte > 0 AND qte <= 5 THEN 1 ELSE 0 END), 0) AS low_stock_count,
        COALESCE(SUM(qte * prix_achat), 0.00) AS total_cost_value,
        COALESCE(SUM(qte * prix_vente), 0.00) AS total_retail_value
      FROM products
    `);

    // Total sales and debt from product_sales
    const [salesStats] = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0.00) AS overall_sales_amount,
        COALESCE(SUM(paid_amount), 0.00) AS overall_paid_amount,
        COALESCE(SUM(remaining_debt), 0.00) AS overall_remaining_debt,
        COALESCE(COUNT(CASE WHEN remaining_debt > 0 THEN 1 END), 0) AS debtors_count
      FROM product_sales
    `);

    return res.json({
      success: true,
      data: products,
      stats: {
        ...statsRows[0],
        ...salesStats[0]
      }
    });
  } catch (error) {
    console.error('getProducts error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 2. Create product
export const createProduct = async (req, res) => {
  try {
    const { designation, qte, prix_achat, prix_vente } = req.body;

    if (!designation || !designation.trim()) {
      return res.status(400).json({
        success: false,
        message: req.t('product_name_required') || 'اسم المنتج مطلوب'
      });
    }

    const quantity = parseInt(qte || 0, 10);
    const buyPrice = parseFloat(prix_achat || 0);
    const sellPrice = parseFloat(prix_vente || 0);

    if (quantity < 0 || buyPrice < 0 || sellPrice < 0) {
      return res.status(400).json({
        success: false,
        message: req.t('invalid_product_numbers') || 'القيم المدخلة للكمية والأسعار يجب أن تكون موجبة'
      });
    }

    const [result] = await pool.query(`
      INSERT INTO products (designation, qte, prix_achat, prix_vente)
      VALUES (?, ?, ?, ?)
    `, [designation.trim(), quantity, buyPrice, sellPrice]);

    logActivity(req, {
      action_type: 'CREATE',
      data_type: 'PRODUCT',
      entity_id: result.insertId,
      entity_name: designation.trim(),
      details: `إضافة منتج جديد: "${designation.trim()}"، الكمية: ${quantity}، سعر الشراء: ${buyPrice} دج، سعر البيع: ${sellPrice} دج`
    });

    return res.status(201).json({
      success: true,
      message: req.t('product_created_success') || 'تمت إضافة المنتج بنجاح إلى المخزون',
      data: {
        id: result.insertId,
        designation: designation.trim(),
        qte: quantity,
        prix_achat: buyPrice,
        prix_vente: sellPrice
      }
    });
  } catch (error) {
    console.error('createProduct error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 3. Update product
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { designation, qte, prix_achat, prix_vente } = req.body;

    if (!designation || !designation.trim()) {
      return res.status(400).json({
        success: false,
        message: req.t('product_name_required') || 'اسم المنتج مطلوب'
      });
    }

    const quantity = parseInt(qte || 0, 10);
    const buyPrice = parseFloat(prix_achat || 0);
    const sellPrice = parseFloat(prix_vente || 0);

    const [existing] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: req.t('product_not_found') || 'المنتج غير موجود'
      });
    }

    await pool.query(`
      UPDATE products 
      SET designation = ?, qte = ?, prix_achat = ?, prix_vente = ?
      WHERE id = ?
    `, [designation.trim(), quantity, buyPrice, sellPrice, id]);

    logActivity(req, {
      action_type: 'UPDATE',
      data_type: 'PRODUCT',
      entity_id: parseInt(id, 10),
      entity_name: designation.trim(),
      details: `تحديث بيانات المنتج: "${designation.trim()}"، الكمية الجديدة: ${quantity}، سعر البيع: ${sellPrice} دج`
    });

    return res.json({
      success: true,
      message: req.t('product_updated_success') || 'تم تحديث بيانات المنتج بنجاح'
    });
  } catch (error) {
    console.error('updateProduct error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 4. Delete product (safe check)
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: req.t('product_not_found') || 'المنتج غير موجود'
      });
    }

    const [sales] = await pool.query('SELECT COUNT(*) AS count FROM product_sales WHERE product_id = ?', [id]);
    if (sales[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: req.t('product_has_sales_cannot_delete') || `لا يمكن حذف هذا المنتج لوجود ${sales[0].count} عملية بيع مسجلة به. يمكنك تعديل كميته بدلاً من ذلك.`
      });
    }

    await pool.query('DELETE FROM products WHERE id = ?', [id]);

    logActivity(req, {
      action_type: 'DELETE',
      data_type: 'PRODUCT',
      entity_id: parseInt(id, 10),
      entity_name: existing[0].designation,
      details: `حذف المنتج "${existing[0].designation}" نهائياً من النظام`
    });

    return res.json({
      success: true,
      message: req.t('product_deleted_success') || 'تم حذف المنتج بنجاح'
    });
  } catch (error) {
    console.error('deleteProduct error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 5. Sell product to student
export const sellProduct = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      student_id,
      product_id,
      quantity = 1,
      unit_price,
      paid_amount = 0.00,
      sale_date,
      academic_year_id,
      notes
    } = req.body;

    if (!student_id || !product_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: req.t('student_and_product_required') || 'يجب تحديد الطالب والمنتج'
      });
    }

    const qty = parseInt(quantity, 10);
    if (qty <= 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: req.t('invalid_quantity') || 'الكمية المباعة يجب أن تكون أكبر من 0'
      });
    }

    // Check student existence
    const [students] = await connection.query('SELECT id, full_name, reg_no FROM students WHERE id = ?', [student_id]);
    if (students.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: req.t('student_not_found') || 'الطالب غير موجود'
      });
    }
    const student = students[0];

    // Check product existence and lock row for stock update
    const [products] = await connection.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [product_id]);
    if (products.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: req.t('product_not_found') || 'المنتج غير موجود'
      });
    }
    const product = products[0];

    // Verify stock availability
    if (product.qte < qty) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: req.t('insufficient_stock', { available: product.qte, requested: qty }) || 
          `المخزون المتوفر غير كافٍ! المتوفر حالياً: ${product.qte} قطعة، المطلوب: ${qty} قطعة`
      });
    }

    // Calculate amounts
    const price = unit_price !== undefined && unit_price !== null && unit_price !== ''
      ? parseFloat(unit_price)
      : parseFloat(product.prix_vente);

    if (price < 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: req.t('invalid_price') || 'سعر الوحدة غير صالح'
      });
    }

    const totalAmount = Math.round(qty * price * 100) / 100;
    let paid = parseFloat(paid_amount || 0);
    if (paid < 0) paid = 0;
    if (paid > totalAmount) paid = totalAmount; // Cap at total amount

    const remainingDebt = Math.max(0, Math.round((totalAmount - paid) * 100) / 100);

    let status = 'UNPAID';
    if (paid >= totalAmount) {
      status = 'PAID';
    } else if (paid > 0) {
      status = 'PARTIAL';
    }

    // Generate unique receipt number
    const yearShort = new Date().getFullYear().toString().slice(-2);
    const randomCode = Math.floor(10000 + Math.random() * 90000);
    const receiptNo = `SALE-${yearShort}-${randomCode}`;

    const dateOfSale = sale_date || new Date().toISOString().split('T')[0];
    const userId = req.user?.id || null;
    const deviceId = req.deviceId || null;

    // 1. Decrement product stock
    await connection.query('UPDATE products SET qte = qte - ? WHERE id = ?', [qty, product_id]);

    // 2. Insert product sale record
    const [saleResult] = await connection.query(`
      INSERT INTO product_sales (
        academic_year_id, student_id, product_id, quantity, unit_price,
        total_amount, paid_amount, remaining_debt, sale_date, receipt_no,
        status, notes, user_id, device_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      academic_year_id || null,
      student_id,
      product_id,
      qty,
      price,
      totalAmount,
      paid,
      remainingDebt,
      dateOfSale,
      receiptNo,
      status,
      notes || null,
      userId,
      deviceId
    ]);

    const saleId = saleResult.insertId;

    // 3. If paid > 0, log an entry in product_sale_payments
    if (paid > 0) {
      const payReceiptNo = `REC-S-${yearShort}-${Math.floor(10000 + Math.random() * 90000)}`;
      await connection.query(`
        INSERT INTO product_sale_payments (
          sale_id, amount, payment_date, receipt_no, notes, user_id, device_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        saleId,
        paid,
        dateOfSale,
        payReceiptNo,
        status === 'PAID' ? 'سداد كامل ثمن المشتريات' : 'دفعة مقدمة من ثمن المشتريات',
        userId,
        deviceId
      ]);
    }

    await connection.commit();

    logActivity(req, {
      action_type: 'SALE',
      data_type: 'PRODUCT_SALE',
      entity_id: saleId,
      entity_name: receiptNo,
      details: `بيع ${qty} من "${product.designation}" للطالب "${student.full_name}" بمبلغ ${totalAmount} دج. المدفوع: ${paid} دج، الدين المتبقي: ${remainingDebt} دج (وصل: ${receiptNo})`
    });

    return res.status(201).json({
      success: true,
      message: remainingDebt > 0
        ? (req.t('sale_recorded_with_debt', { debt: remainingDebt }) || `تم تسجيل البيع بنجاح مع إضافة دين متبقٍ قدره ${remainingDebt} دج إلى حساب الطالب`)
        : (req.t('sale_recorded_paid') || 'تم تسجيل عملية البيع واستلام كامل المبلغ بنجاح'),
      data: {
        id: saleId,
        receipt_no: receiptNo,
        student_id,
        student_name: student.full_name,
        reg_no: student.reg_no,
        product_id,
        product_name: product.designation,
        quantity: qty,
        unit_price: price,
        total_amount: totalAmount,
        paid_amount: paid,
        remaining_debt: remainingDebt,
        status,
        sale_date: dateOfSale
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('sellProduct error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  } finally {
    connection.release();
  }
};

// 6. Get all product sales & debts ledger
export const getProductSales = async (req, res) => {
  try {
    const { 
      student_id, 
      product_id, 
      status, 
      has_debt, 
      academic_year_id, 
      search,
      period,
      date,
      start_date,
      end_date
    } = req.query;

    let query = `
      SELECT 
        ps.*,
        s.full_name AS student_name,
        s.reg_no AS student_reg_no,
        s.guardian_phone AS student_guardian_phone,
        p.designation AS product_name,
        p.prix_achat AS product_cost,
        ay.label AS academic_year_label
      FROM product_sales ps
      JOIN students s ON ps.student_id = s.id
      JOIN products p ON ps.product_id = p.id
      LEFT JOIN academic_years ay ON ps.academic_year_id = ay.id
      WHERE 1=1
    `;
    const params = [];

    if (student_id) {
      query += ` AND ps.student_id = ?`;
      params.push(student_id);
    }

    if (product_id) {
      query += ` AND ps.product_id = ?`;
      params.push(product_id);
    }

    if (academic_year_id) {
      query += ` AND ps.academic_year_id = ?`;
      params.push(academic_year_id);
    }

    if (status) {
      query += ` AND ps.status = ?`;
      params.push(status);
    }

    if (has_debt === 'true' || has_debt === true || has_debt === '1') {
      query += ` AND ps.remaining_debt > 0`;
    }

    if (search) {
      query += ` AND (s.full_name LIKE ? OR s.reg_no LIKE ? OR p.designation LIKE ? OR ps.receipt_no LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    // Date & period filtering
    if (date) {
      query += ` AND ps.sale_date = ?`;
      params.push(date);
    } else if (start_date && end_date) {
      query += ` AND ps.sale_date >= ? AND ps.sale_date <= ?`;
      params.push(start_date, end_date);
    } else if (start_date) {
      query += ` AND ps.sale_date >= ?`;
      params.push(start_date);
    } else if (end_date) {
      query += ` AND ps.sale_date <= ?`;
      params.push(end_date);
    } else if (period) {
      if (period === 'today') {
        query += ` AND ps.sale_date = CURRENT_DATE()`;
      } else if (period === 'yesterday') {
        query += ` AND ps.sale_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)`;
      } else if (period === 'this_week') {
        query += ` AND ps.sale_date >= DATE_SUB(CURRENT_DATE(), INTERVAL WEEKDAY(CURRENT_DATE()) DAY)`;
      } else if (period === 'this_month') {
        query += ` AND ps.sale_date >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')`;
      }
      // 'all' has no date constraint
    }

    query += ` ORDER BY ps.sale_date DESC, ps.id DESC`;

    const [sales] = await pool.query(query, params);

    return res.json({
      success: true,
      data: sales
    });
  } catch (error) {
    console.error('getProductSales error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 7. Pay off product debt (full or partial installment)
export const payProductDebt = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params; // sale_id
    const { amount, payment_date, notes } = req.body;

    const payAmount = parseFloat(amount || 0);
    if (payAmount <= 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: req.t('invalid_payment_amount') || 'مبلغ السداد يجب أن يكون أكبر من 0'
      });
    }

    // Fetch sale record
    const [sales] = await connection.query(`
      SELECT ps.*, s.full_name AS student_name, s.reg_no, p.designation AS product_name
      FROM product_sales ps
      JOIN students s ON ps.student_id = s.id
      JOIN products p ON ps.product_id = p.id
      WHERE ps.id = ? FOR UPDATE
    `, [id]);

    if (sales.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: req.t('sale_not_found') || 'سجل المبيعات غير موجود'
      });
    }

    const sale = sales[0];
    const currentDebt = parseFloat(sale.remaining_debt || 0);

    if (currentDebt <= 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: req.t('sale_already_paid') || 'هذه العملية مسددة بالكامل ولا يوجد أي دين متبقٍ عليها'
      });
    }

    if (payAmount > currentDebt) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: req.t('payment_exceeds_debt', { currentDebt }) || 
          `المبلغ المدخل (${payAmount} دج) أكبر من الدين المتبقي (${currentDebt} دج)`
      });
    }

    const newPaidAmount = Math.round((parseFloat(sale.paid_amount) + payAmount) * 100) / 100;
    const newRemainingDebt = Math.max(0, Math.round((currentDebt - payAmount) * 100) / 100);
    const newStatus = newRemainingDebt === 0 ? 'PAID' : 'PARTIAL';

    const payDate = payment_date || new Date().toISOString().split('T')[0];
    const yearShort = new Date().getFullYear().toString().slice(-2);
    const payReceiptNo = `REC-DEBT-${yearShort}-${Math.floor(10000 + Math.random() * 90000)}`;
    const userId = req.user?.id || null;
    const deviceId = req.deviceId || null;

    // 1. Update sale record
    await connection.query(`
      UPDATE product_sales 
      SET paid_amount = ?, remaining_debt = ?, status = ?
      WHERE id = ?
    `, [newPaidAmount, newRemainingDebt, newStatus, id]);

    // 2. Insert payment installment
    const [payResult] = await connection.query(`
      INSERT INTO product_sale_payments (
        sale_id, amount, payment_date, receipt_no, notes, user_id, device_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      payAmount,
      payDate,
      payReceiptNo,
      notes || (newRemainingDebt === 0 ? 'سداد كامل الدين المتبقي على المنتج' : 'تسديد دفعة جزئية من دين المنتج'),
      userId,
      deviceId
    ]);

    await connection.commit();

    logActivity(req, {
      action_type: 'PAY_DEBT',
      data_type: 'PRODUCT_SALE',
      entity_id: parseInt(id, 10),
      entity_name: payReceiptNo,
      details: `سداد دين منتج بمبلغ ${payAmount} دج للطالب "${sale.student_name}" على عملية شراء "${sale.product_name}". المتبقي الآن: ${newRemainingDebt} دج (وصل: ${payReceiptNo})`
    });

    return res.json({
      success: true,
      message: newRemainingDebt === 0
        ? (req.t('debt_settled_full') || 'تم سداد الدين بالكامل بنجاح وتصفية حساب العملية')
        : (req.t('debt_paid_partial', { remaining: newRemainingDebt }) || `تم سداد الدفعة بنجاح، والمتبقي الآن: ${newRemainingDebt} دج`),
      data: {
        payment_id: payResult.insertId,
        payment_receipt_no: payReceiptNo,
        amount_paid: payAmount,
        total_paid_now: newPaidAmount,
        remaining_debt_now: newRemainingDebt,
        status: newStatus
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('payProductDebt error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  } finally {
    connection.release();
  }
};

// 8. Get full debts and purchase history for a specific student
export const getStudentDebtsAndPurchases = async (req, res) => {
  try {
    const { studentId } = req.params;

    const [sales] = await pool.query(`
      SELECT 
        ps.*,
        p.designation AS product_name,
        p.prix_achat AS product_cost
      FROM product_sales ps
      JOIN products p ON ps.product_id = p.id
      WHERE ps.student_id = ?
      ORDER BY ps.sale_date DESC, ps.id DESC
    `, [studentId]);

    // For each sale, get payments history
    const saleIds = sales.map(s => s.id);
    let paymentsMap = new Map();
    if (saleIds.length > 0) {
      const [payments] = await pool.query(`
        SELECT * FROM product_sale_payments WHERE sale_id IN (?) ORDER BY payment_date ASC
      `, [saleIds]);
      payments.forEach(p => {
        const arr = paymentsMap.get(p.sale_id) || [];
        arr.push(p);
        paymentsMap.set(p.sale_id, arr);
      });
    }

    const enrichedSales = sales.map(s => ({
      ...s,
      payments: paymentsMap.get(s.id) || []
    }));

    const totalPurchases = sales.length;
    const totalAmount = sales.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
    const totalPaid = sales.reduce((sum, s) => sum + parseFloat(s.paid_amount || 0), 0);
    const totalRemainingDebt = sales.reduce((sum, s) => sum + parseFloat(s.remaining_debt || 0), 0);
    const unpaidSalesCount = sales.filter(s => parseFloat(s.remaining_debt || 0) > 0).length;

    return res.json({
      success: true,
      data: {
        summary: {
          totalPurchases,
          totalAmount,
          totalPaid,
          totalRemainingDebt,
          unpaidSalesCount
        },
        sales: enrichedSales
      }
    });

  } catch (error) {
    console.error('getStudentDebtsAndPurchases error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};
