import express from 'express';
import { 
  getSettings, 
  updateSettings, 
  uploadAssets, 
  upload,
  exportDatabaseDownload,
  runBackupNow,
  verifyBackupFolder,
  getBackupStatus,
  exploreDirectories,
  createBackupDirectory
} from '../controllers/settingsController.js';

const router = express.Router();

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/upload-assets', upload.single('file'), uploadAssets);

// Database backup & export routes
router.get('/backup/download', exportDatabaseDownload);
router.post('/backup/run-now', runBackupNow);
router.post('/backup/verify-folder', verifyBackupFolder);
router.get('/backup/status', getBackupStatus);
router.get('/backup/explore-directory', exploreDirectories);
router.post('/backup/create-directory', createBackupDirectory);

export default router;
