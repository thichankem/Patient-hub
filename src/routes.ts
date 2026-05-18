import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

router.use('/auth', authRoutes);

// Thêm module mới tại đây:
// router.use('/patients', patientRoutes);
// router.use('/appointments', appointmentRoutes);

export default router;
