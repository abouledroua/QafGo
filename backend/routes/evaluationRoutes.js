import express from 'express';
import {
  logTahfizSession,
  getTahfizLogsByEnrollment,
  logPreschoolSkill,
  getPreschoolLogsByEnrollment,
  logTutoringGrade,
  getTutoringGradesByEnrollment
} from '../controllers/evaluationController.js';

const router = express.Router();

// Tahfiz
router.post('/tahfiz', logTahfizSession);
router.get('/tahfiz/:enrollmentId', getTahfizLogsByEnrollment);

// PreSchool
router.post('/preschool', logPreschoolSkill);
router.get('/preschool/:enrollmentId', getPreschoolLogsByEnrollment);

// Tutoring
router.post('/tutoring', logTutoringGrade);
router.get('/tutoring/:enrollmentId', getTutoringGradesByEnrollment);

export default router;
