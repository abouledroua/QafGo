import express from 'express';
import {
  getWeeklyTimetable,
  createTimetableSession,
  updateTimetableSession,
  deleteTimetableSession
} from '../controllers/timetableController.js';

const router = express.Router();

router.get('/week', getWeeklyTimetable);
router.post('/sessions', createTimetableSession);
router.put('/sessions/:id', updateTimetableSession);
router.delete('/sessions/:id', deleteTimetableSession);

export default router;
