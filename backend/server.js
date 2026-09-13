import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
['students', 'teachers', 'logos', 'stamps', 'general'].forEach((sub) => {
  const p = path.join(uploadDir, sub);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

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
import userRoutes from './routes/userRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import productRoutes from './routes/productRoutes.js';

import jwt from 'jsonwebtoken';
import pool from './config/db.js';
import i18nMiddleware from './middleware/i18nMiddleware.js';
import { ensureDefaultSettingsRow } from './controllers/settingsController.js';
import { ensureDefaultAdminUser } from './controllers/authController.js';
import { migrateGroupGenderAndUserAccess } from './database/addGroupGenderAndUserAccess.js';
import { migrateProductsAndSalesTable } from './database/createProductsAndSalesTable.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration: allow all local dev / local network origins
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-Poste-Name', 'X-Workstation-Id', 'X-Device-Key']
}));
app.use(express.json());
app.use(i18nMiddleware);

// Universal token & device resolver: extracts req.user and req.deviceId
app.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'qafgo_super_secure_jwt_secret_key_2026');
      req.user = decoded;
    } catch {
      // Non-blocking: unauthenticated or expired token
    }
  }

  const rawKey = req.headers['x-device-key'];
  if (rawKey) {
    try {
      const cleanKey = String(rawKey).trim().toUpperCase();
      const [devRows] = await pool.query('SELECT id, device_name FROM devices WHERE device_key = ? LIMIT 1', [cleanKey]);
      if (devRows.length > 0) {
        req.deviceId = devRows[0].id;
        req.deviceKey = cleanKey;
        req.deviceName = devRows[0].device_name;
      }
    } catch {
      // Non-blocking
    }
  }
  next();
});

app.use('/uploads', express.static(uploadDir));

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
app.use('/api/users', userRoutes);
app.use('/api/logs', auditLogRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/products', productRoutes);

// Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, message: 'حدث خطأ غير متوقع في الخادم', error: err.message });
});

app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`🚀 خادم منصة قاف غو (QafGo API) يعمل بنجاح على المنفذ: ${PORT}`);
  console.log(`🔗 رابط الخادم: http://localhost:${PORT}`);
  console.log(`====================================================`);
  try {
    await ensureDefaultSettingsRow();
    await ensureDefaultAdminUser();
    await migrateGroupGenderAndUserAccess();
    await migrateProductsAndSalesTable();
  } catch (err) {
    console.error('Failed to initialize default database rows on startup:', err);
  }
});
