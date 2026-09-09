import express from 'express';
import { 
  getGroupAttendanceByDate, 
  saveBulkAttendance,
  getGroupTeacherAttendance,
  saveTeacherAttendance,
  saveTeacherSubstitutionRange,
  getTeacherAbsenceReport
} from '../controllers/attendanceController.js';

const router = express.Router();

// Student attendance
router.get('/group/:groupId', getGroupAttendanceByDate);
router.post('/bulk', saveBulkAttendance);

// Teacher attendance & substitution
router.get('/teacher/group/:groupId', getGroupTeacherAttendance);
router.post('/teacher', saveTeacherAttendance);
router.post('/teacher/range', saveTeacherSubstitutionRange);
router.get('/teacher/report', getTeacherAbsenceReport);

export default router;
