import express from 'express';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  sellProduct,
  getProductSales,
  payProductDebt,
  getStudentDebtsAndPurchases
} from '../controllers/productController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Products management
router.get('/', getProducts);
router.post('/', requireRole('ADMIN', 'SUPERVISOR'), createProduct);
router.put('/:id', requireRole('ADMIN', 'SUPERVISOR'), updateProduct);
router.delete('/:id', requireRole('ADMIN', 'SUPERVISOR'), deleteProduct);

// Sales & Debt operations
router.post('/sell', requireRole('ADMIN', 'SUPERVISOR'), sellProduct);
router.get('/sales', getProductSales);
router.post('/sales/:id/pay-debt', requireRole('ADMIN', 'SUPERVISOR'), payProductDebt);
router.get('/students/:studentId/debts', getStudentDebtsAndPurchases);

export default router;
