import express from 'express';
import {
  checkDevice,
  lookupDevice,
  registerDevice,
  getDevices
} from '../controllers/deviceController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Device check & fingerprint lookup (can be checked before full login or post-login)
router.get('/check/:key', checkDevice);
router.get('/lookup', lookupDevice);

// Register / claim device name (authenticated)
router.post('/register', authenticate, registerDevice);

// List all devices (ADMIN only)
router.get('/', authenticate, requireRole('ADMIN'), getDevices);

export default router;
