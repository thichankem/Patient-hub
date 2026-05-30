import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createPrescriptionSchema,
  idParamSchema,
  listQuerySchema,
  updatePrescriptionSchema,
} from './prescriptions.schema';
import * as ctrl from './prescriptions.controller';

const router = Router();
router.use(authenticate);

router.post(
  '/',
  requireRole('doctor'),
  validate({ body: createPrescriptionSchema }),
  ctrl.createPrescription,
);

// Bác sĩ: tất cả đơn thuốc thuộc đợt khám của mình — đặt trước route có '/:id'.
router.get(
  '/doctor/mine',
  requireRole('doctor'),
  ctrl.listMineForDoctor,
);

// Xem đơn thuốc theo đợt khám (?session_id=) — bác sĩ hoặc bệnh nhân.
router.get(
  '/',
  requireRole('doctor', 'patient'),
  validate({ query: listQuerySchema }),
  ctrl.listBySession,
);

router.get(
  '/:id',
  requireRole('doctor', 'patient'),
  validate({ params: idParamSchema }),
  ctrl.getPrescription,
);

router.patch(
  '/:id',
  requireRole('doctor'),
  validate({ params: idParamSchema, body: updatePrescriptionSchema }),
  ctrl.updatePrescription,
);

export default router;
