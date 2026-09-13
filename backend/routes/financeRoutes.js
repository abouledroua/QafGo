import express from 'express';
import { 
  getFinanceOverview, 
  getPayments, 
  createPaymentOrVoucher, 
  getUnpaidStudents,
  createRefund,
  getRefunds,
  createCashTransaction,
  getCashTransactions,
  deleteCashTransaction
} from '../controllers/financeController.js';

const router = express.Router();

router.get('/overview', getFinanceOverview);
router.get('/payments', getPayments);
router.post('/payments', createPaymentOrVoucher);
router.get('/unpaid', getUnpaidStudents);
router.get('/refunds', getRefunds);
router.post('/refunds', createRefund);

// Cash Register (La Caisse: Alimentation & Retrait)
router.get('/cash-transactions', getCashTransactions);
router.post('/cash-transactions', createCashTransaction);
router.delete('/cash-transactions/:id', deleteCashTransaction);

export default router;

