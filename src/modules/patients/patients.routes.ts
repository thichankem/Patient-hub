import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createPatientSchema,
  idParamSchema,
  listPatientQuerySchema,
  updatePatientSchema,
} from './patients.schema';
import * as patientsController from './patients.controller';

const router = Router();
router.use(authenticate);

// Bệnh nhân xem hồ sơ của mình — đặt trước '/:id' để không bị nuốt param.
router.get('/me', requireRole('patient'), patientsController.getMyProfile);

router.post(
  '/',
  requireRole('receptionist'),
  validate({ body: createPatientSchema }),
  patientsController.createPatient,
);

// Tiếp tân quản lý, bác sĩ tra cứu để khám. Quản lý KHÔNG xem hồ sơ bệnh án.
router.get(
  '/',
  requireRole('receptionist', 'doctor'),
  validate({ query: listPatientQuerySchema }),
  patientsController.listPatients,
);

router.get(
  '/:id',
  requireRole('receptionist', 'doctor'),
  validate({ params: idParamSchema }),
  patientsController.getPatient,
);

router.patch(
  '/:id',
  requireRole('receptionist'),
  validate({ params: idParamSchema, body: updatePatientSchema }),
  patientsController.updatePatient,
);

router.post(
  '/:id/reset-password',
  requireRole('receptionist'),
  validate({ params: idParamSchema }),
  patientsController.resetPassword,
);

export default router;
