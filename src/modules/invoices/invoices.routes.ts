import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  generateInvoiceSchema,
  idParamSchema,
  listQuerySchema,
  payCashSchema,
  payVnpaySchema,
  revenueQuerySchema,
} from './invoices.schema';
import * as ctrl from './invoices.controller';

const router = Router();

// ─── Public endpoints (VNPay + PayOS callbacks) ──────────────────────────────
// Cổng thanh toán gọi trực tiếp, không có Bearer token.
// Phải đặt TRƯỚC middleware auth.
router.get('/vnpay-return', ctrl.vnpayReturn);
router.get('/vnpay-ipn', ctrl.vnpayIpn);
// PayOS dùng POST + JSON body, signature trong body.
router.post('/payos-webhook', ctrl.payosWebhook);

// ─── Các endpoint còn lại đều cần auth ──────────────────────────────────────
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
  validate({ params: idParamSchema, body: payVnpaySchema }),
  ctrl.payVnpay,
);

router.post(
  '/:id/pay-payos',
  requireRole('patient'),
  validate({ params: idParamSchema }),
  ctrl.payPayos,
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
