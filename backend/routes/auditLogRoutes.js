import express from 'express';
import {
  getAuditLogs,
  getAuditLogFilterOptions,
  exportAuditLogs
} from '../controllers/auditLogController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Strict security: Only ADMIN role can access audit logs
router.use(authenticate, requireRole('ADMIN'));

router.get('/', getAuditLogs);
router.get('/filters', getAuditLogFilterOptions);
router.get('/export', exportAuditLogs);

export default router;
