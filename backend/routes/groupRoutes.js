import express from 'express';
import { 
  getGroups, 
  getGroupById, 
  createGroup, 
  updateGroup, 
  changeGroupStatus,
  deleteGroup, 
  enrollStudentInGroup,
  stopGroupEnrollment,
  resumeGroupEnrollment
} from '../controllers/groupController.js';

const router = express.Router();

router.get('/', getGroups);
router.get('/:id', getGroupById);
router.post('/', createGroup);
router.put('/:id', updateGroup);
router.patch('/:id/status', changeGroupStatus);
router.delete('/:id', deleteGroup);
router.post('/:id/enroll', enrollStudentInGroup);
router.put('/:id/enrollments/:enrollmentId/stop', stopGroupEnrollment);
router.put('/:id/enrollments/:enrollmentId/resume', resumeGroupEnrollment);

export default router;

