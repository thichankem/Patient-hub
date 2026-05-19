import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createAppointmentSchema,
  idParamSchema,
  listAppointmentQuerySchema,
  reassignSchema,
} from './appointments.schema';
import * as appointmentsController from './appointments.controller';

const router = Router();
router.use(authenticate);

router.post(
  '/',
  requireRole('patient', 'receptionist', 'manager'),
  validate({ body: createAppointmentSchema }),
  appointmentsController.createAppointment,
);

router.get(
  '/',
  validate({ query: listAppointmentQuerySchema }),
  appointmentsController.listAppointments,
);

router.get(
  '/:id',
  validate({ params: idParamSchema }),
  appointmentsController.getAppointment,
);

// Bác sĩ: đã đặt → đang khám (tự tạo đợt khám).
router.post(
  '/:id/start',
  requireRole('doctor'),
  validate({ params: idParamSchema }),
  appointmentsController.startExamination,
);

// Bệnh nhân tự hủy / Quản lý hủy.
router.post(
  '/:id/cancel',
  requireRole('patient', 'manager'),
  validate({ params: idParamSchema }),
  appointmentsController.cancelAppointment,
);

// Quản lý đổi bác sĩ.
router.patch(
  '/:id/reassign',
  requireRole('manager'),
  validate({ params: idParamSchema, body: reassignSchema }),
  appointmentsController.reassignDoctor,
);

export default router;
