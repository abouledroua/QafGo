import express from 'express';
import { 
  getStudents, 
  getStudentById, 
  createStudent, 
  updateStudent, 
  deleteStudent,
  getStudentLifetimeDossier,
  recalculateAllDebts
} from '../controllers/studentController.js';

const router = express.Router();

router.get('/', getStudents);
router.post('/recalculate-debt', recalculateAllDebts);
router.get('/:id', getStudentById);
router.post('/', createStudent);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);
router.get('/:id/history', getStudentLifetimeDossier);

export default router;
