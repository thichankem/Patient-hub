import { Router } from 'express';
import { pingDb } from './db/pool';
import { aiHealth } from './modules/ai/ai.stub';
import authRoutes from './modules/auth/auth.routes';
import departmentsRoutes from './modules/departments/departments.routes';
import libraryRoutes from './modules/library/library.routes';
import labRoomsRoutes from './modules/lab-rooms/lab-rooms.routes';
import staffRoutes from './modules/staff/staff.routes';
import patientsRoutes from './modules/patients/patients.routes';
import appointmentsRoutes from './modules/appointments/appointments.routes';
import examinationRoutes from './modules/examination-sessions/examination.routes';
import testOrdersRoutes from './modules/test-orders/test-orders.routes';
import prescriptionsRoutes from './modules/prescriptions/prescriptions.routes';
import invoicesRoutes from './modules/invoices/invoices.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import reportsRoutes from './modules/reports/reports.routes';
import chatRoutes from './modules/chat/chat.routes';
import chatbotRoutes from './modules/ai/chatbot.routes';
import managerRoutes from './modules/manager/manager.routes';

const router = Router();

// Liveness — server còn sống không (không gọi DB để LB giữ pod sống ngay cả khi
// DB tạm down → cho thời gian recover).
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// Readiness — server có sẵn sàng nhận traffic không (DB up + AI components OK).
// LB / k8s nên dùng endpoint này.
router.get('/ready', async (_req, res) => {
  const db = await pingDb();
  const ai = aiHealth();
  const ok = db.ok;
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ready' : 'not_ready',
    db,
    ai,
    ts: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/departments', departmentsRoutes);
router.use('/library', libraryRoutes);
router.use('/lab-rooms', labRoomsRoutes);
router.use('/staff', staffRoutes);
router.use('/patients', patientsRoutes);
router.use('/appointments', appointmentsRoutes);
router.use('/examination-sessions', examinationRoutes);
router.use('/test-orders', testOrdersRoutes);
router.use('/prescriptions', prescriptionsRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/reports', reportsRoutes);
router.use('/chat', chatRoutes);
router.use('/chatbot', chatbotRoutes);
router.use('/manager', managerRoutes);

export default router;
