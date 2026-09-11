import express from 'express';
import {
  getUsers,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser
} from '../controllers/userController.js';
import { authenticate, requireRole, requirePermission } from '../middleware/auth.js';

const router = express.Router();

// All user management routes require authentication and either ADMIN role or 'users' permission
router.use(authenticate, requireRole('ADMIN'));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.put('/:id/password', resetUserPassword);
router.delete('/:id', deleteUser);

export default router;
