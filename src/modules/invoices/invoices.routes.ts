import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  generateInvoiceSchema,
  idParamSchema,
  listQuerySchema,
  payCashSchema,
  revenueQuerySchema,
} from './invoices.schema';
import * as ctrl from './invoices.controller';

const router = Router();
router.use(authenticate);

router.post(
  '/generate',
  requireRole('cashier', 'patient'),
  validate({ body: generateInvoiceSchema }),
  ctrl.generate,
);

router.post(
  '/:id/pay-vnpay',
  requireRole('patient'),
  validate({ params: idParamSchema }),
  ctrl.payVnpay,
);

router.post(
  '/:id/pay-cash',
  requireRole('cashier'),
  validate({ params: idParamSchema, body: payCashSchema }),
  ctrl.payCash,
);

router.get(
  '/revenue',
  requireRole('manager'),
  validate({ query: revenueQuerySchema }),
  ctrl.revenue,
);

router.get(
  '/',
  requireRole('patient', 'cashier', 'manager'),
  validate({ query: listQuerySchema }),
  ctrl.list,
);

router.get(
  '/:id',
  requireRole('patient', 'cashier', 'manager'),
  validate({ params: idParamSchema }),
  ctrl.get,
);

export default router;
