import express from 'express';
import { 
  getAcademicYears, 
  createAcademicYear, 
  setCurrentYear, 
  toggleLockYear, 
  rolloverAcademicYear 
} from '../controllers/academicYearController.js';

const router = express.Router();

router.get('/', getAcademicYears);
router.post('/', createAcademicYear);
router.put('/:id/set-current', setCurrentYear);
router.put('/:id/toggle-lock', toggleLockYear);
router.post('/rollover', rolloverAcademicYear);

export default router;
