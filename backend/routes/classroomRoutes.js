import express from 'express';
import {
  getAllClassrooms,
  getClassroomById,
  createClassroom,
  updateClassroom,
  deleteClassroom
} from '../controllers/classroomController.js';

const router = express.Router();

router.get('/', getAllClassrooms);
router.get('/:id', getClassroomById);
router.post('/', createClassroom);
router.put('/:id', updateClassroom);
router.delete('/:id', deleteClassroom);

export default router;
