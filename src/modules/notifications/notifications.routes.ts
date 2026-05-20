import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  broadcastSchema,
  idParamSchema,
  listQuerySchema,
} from './notifications.schema';
import * as ctrl from './notifications.controller';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  requireRole('patient', 'doctor', 'technician', 'manager'),
  validate({ query: listQuerySchema }),
  ctrl.list,
);

router.get(
  '/unread-count',
  requireRole('patient', 'doctor', 'technician', 'manager'),
  ctrl.unreadCount,
);

router.patch(
  '/mark-all-read',
  requireRole('patient', 'doctor', 'technician', 'manager'),
  ctrl.markAllRead,
);

router.patch(
  '/:id/read',
  requireRole('patient', 'doctor', 'technician', 'manager'),
  validate({ params: idParamSchema }),
  ctrl.markRead,
);

router.post(
  '/broadcast',
  requireRole('manager'),
  validate({ body: broadcastSchema }),
  ctrl.broadcast,
);

export default router;
