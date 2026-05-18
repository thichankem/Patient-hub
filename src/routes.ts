import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes';
import departmentsRoutes from './modules/departments/departments.routes';
import libraryRoutes from './modules/library/library.routes';
import labRoomsRoutes from './modules/lab-rooms/lab-rooms.routes';
import staffRoutes from './modules/staff/staff.routes';
import patientsRoutes from './modules/patients/patients.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/departments', departmentsRoutes);
router.use('/library', libraryRoutes);
router.use('/lab-rooms', labRoomsRoutes);
router.use('/staff', staffRoutes);
router.use('/patients', patientsRoutes);

export default router;
