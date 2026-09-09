import express from 'express';
import { 
  getGroups, 
  getGroupById, 
  createGroup, 
  updateGroup, 
  changeGroupStatus,
  deleteGroup, 
  enrollStudentInGroup 
} from '../controllers/groupController.js';

const router = express.Router();

router.get('/', getGroups);
router.get('/:id', getGroupById);
router.post('/', createGroup);
router.put('/:id', updateGroup);
router.patch('/:id/status', changeGroupStatus);
router.delete('/:id', deleteGroup);
router.post('/:id/enroll', enrollStudentInGroup);

export default router;
