import express from 'express';
import { 
  getGroupAttendanceByDate, 
  getGroupMonthlyAttendance,
  saveBulkAttendance,
  getGroupTeacherAttendance,
  saveTeacherAttendance,
  saveTeacherSubstitutionRange,
  getTeacherAbsenceReport,
  getGroupSessionsList,
  updateSessionDate,
  deleteSessionAttendance
} from '../controllers/attendanceController.js';

const router = express.Router();

// Group Sessions History & Lifecycle
router.get('/group/:groupId/sessions', getGroupSessionsList);
router.put('/group/:groupId/session-date', updateSessionDate);
router.delete('/group/:groupId/session', deleteSessionAttendance);

// Student attendance
router.get('/group/:groupId/monthly', getGroupMonthlyAttendance);
router.get('/group/:groupId', getGroupAttendanceByDate);
router.post('/bulk', saveBulkAttendance);

// Teacher attendance & substitution
router.get('/teacher/group/:groupId', getGroupTeacherAttendance);
router.post('/teacher', saveTeacherAttendance);
router.post('/teacher/range', saveTeacherSubstitutionRange);
router.get('/teacher/report', getTeacherAbsenceReport);

export default router;
