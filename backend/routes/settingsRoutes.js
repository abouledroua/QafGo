import express from 'express';
import { getSettings, updateSettings, uploadAssets, upload } from '../controllers/settingsController.js';

const router = express.Router();

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/upload-assets', upload.single('file'), uploadAssets);

export default router;
