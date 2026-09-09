import express from 'express';
import { executeTransfer, getTransfersLog } from '../controllers/transferController.js';

const router = express.Router();

router.post('/', executeTransfer);
router.get('/', getTransfersLog);

export default router;
