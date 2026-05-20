import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  historyQuerySchema,
  peerParamSchema,
  sendMessageSchema,
} from './chat.schema';
import * as ctrl from './chat.controller';

const router = Router();
router.use(authenticate);

router.get(
  '/conversations',
  requireRole('doctor', 'technician', 'manager'),
  ctrl.conversations,
);

router.get(
  '/with/:peerId',
  requireRole('doctor', 'technician', 'manager'),
  validate({ params: peerParamSchema, query: historyQuerySchema }),
  ctrl.history,
);

router.post(
  '/messages',
  requireRole('doctor', 'technician', 'manager'),
  validate({ body: sendMessageSchema }),
  ctrl.send,
);

export default router;
