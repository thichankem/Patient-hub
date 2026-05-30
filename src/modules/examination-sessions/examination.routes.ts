import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  idParamSchema,
  patientIdParamSchema,
  updateSessionSchema,
} from './examination.schema';
import * as ctrl from './examination.controller';

const router = Router();
router.use(authenticate);

// Bệnh nhân: hồ sơ bệnh án của mình — đặt trước '/:id'.
router.get('/me', requireRole('patient'), ctrl.listMySessions);
router.get(
  '/me/medical-history',
  requireRole('patient'),
  ctrl.myMedicalHistory,
);

// Bác sĩ: danh sách đợt khám mình đang phụ trách.
router.get(
  '/doctor/mine',
  requireRole('doctor'),
  ctrl.listDoctorSessions,
);

// Bác sĩ tra cứu hồ sơ bệnh nhân.
router.get(
  '/patient/:patientId',
  requireRole('doctor'),
  validate({ params: patientIdParamSchema }),
  ctrl.listByPatient,
);
router.get(
  '/patient/:patientId/medical-history',
  requireRole('doctor'),
  validate({ params: patientIdParamSchema }),
  ctrl.patientMedicalHistory,
);

router.get(
  '/:id',
  requireRole('patient', 'doctor'),
  validate({ params: idParamSchema }),
  ctrl.getSessionDetail,
);

router.patch(
  '/:id',
  requireRole('doctor'),
  validate({ params: idParamSchema, body: updateSessionSchema }),
  ctrl.updateSession,
);

router.post(
  '/:id/finalize',
  requireRole('doctor'),
  validate({ params: idParamSchema }),
  ctrl.finalizeSession,
);

export default router;
