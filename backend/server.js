import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/authRoutes.js';
import academicYearRoutes from './routes/academicYearRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import evaluationRoutes from './routes/evaluationRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import classroomRoutes from './routes/classroomRoutes.js';
import timetableRoutes from './routes/timetableRoutes.js';

import i18nMiddleware from './middleware/i18nMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language']
}));
app.use(express.json());
app.use(i18nMiddleware);
app.use('/uploads', express.static(path.resolve('./uploads')));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', platform: 'منصة قاف غو', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/academic-years', academicYearRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/timetable', timetableRoutes);

// Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, message: 'حدث خطأ غير متوقع في الخادم', error: err.message });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 خادم منصة قاف غو (QafGo API) يعمل بنجاح على المنفذ: ${PORT}`);
  console.log(`🔗 رابط الخادم: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
