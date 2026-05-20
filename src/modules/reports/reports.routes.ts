import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createReportSchema,
  idParamSchema,
  listQuerySchema,
} from './reports.schema';
import * as ctrl from './reports.controller';

const router = Router();
router.use(authenticate);

router.post(
  '/',
  requireRole('patient', 'doctor', 'technician', 'manager'),
  validate({ body: createReportSchema }),
  ctrl.create,
);

router.get(
  '/',
  requireRole('patient', 'doctor', 'technician', 'manager'),
  validate({ query: listQuerySchema }),
  ctrl.list,
);

router.get(
  '/:id',
  requireRole('patient', 'doctor', 'technician', 'manager'),
  validate({ params: idParamSchema }),
  ctrl.get,
);

router.patch(
  '/:id/resolve',
  requireRole('manager'),
  validate({ params: idParamSchema }),
  ctrl.resolve,
);

export default router;
