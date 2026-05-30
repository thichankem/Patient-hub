import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createTestOrderSchema,
  idParamSchema,
  itemIdParamSchema,
  listBySessionQuerySchema,
  updateItemStatusSchema,
} from './test-orders.schema';
import * as ctrl from './test-orders.controller';

const router = Router();
router.use(authenticate);

router.post(
  '/',
  requireRole('doctor'),
  validate({ body: createTestOrderSchema }),
  ctrl.createTestOrder,
);

// Bác sĩ: tất cả yêu cầu xét nghiệm thuộc các đợt khám của mình.
router.get(
  '/doctor/mine',
  requireRole('doctor'),
  ctrl.listMineForDoctor,
);

// Bác sĩ xem yêu cầu xét nghiệm theo đợt khám (?session_id=).
router.get(
  '/',
  requireRole('doctor'),
  validate({ query: listBySessionQuerySchema }),
  ctrl.listBySession,
);

// Bệnh nhân: lịch xét nghiệm của mình (thời gian thực).
router.get('/me', requireRole('patient'), ctrl.listMySchedule);

// KTV: hàng chờ phòng mình phụ trách.
router.get(
  '/technician/queue',
  requireRole('technician'),
  ctrl.technicianQueue,
);

// Thao tác trên từng mục xét nghiệm — đặt trước '/:id'.
router.patch(
  '/items/:itemId/status',
  requireRole('technician'),
  validate({ params: itemIdParamSchema, body: updateItemStatusSchema }),
  ctrl.updateItemStatus,
);
router.post(
  '/items/:itemId/cancel',
  requireRole('technician'),
  validate({ params: itemIdParamSchema }),
  ctrl.cancelItem,
);
router.patch(
  '/items/:itemId/review',
  requireRole('doctor'),
  validate({ params: itemIdParamSchema }),
  ctrl.reviewItem,
);

router.get(
  '/:id',
  requireRole('doctor', 'patient'),
  validate({ params: idParamSchema }),
  ctrl.getTestOrderDetail,
);

export default router;
