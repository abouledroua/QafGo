import express from 'express';
import { 
  getFinanceOverview, 
  getPayments, 
  createPaymentOrVoucher, 
  getUnpaidStudents 
} from '../controllers/financeController.js';

const router = express.Router();

router.get('/overview', getFinanceOverview);
router.get('/payments', getPayments);
router.post('/payments', createPaymentOrVoucher);
router.get('/unpaid', getUnpaidStudents);

export default router;
