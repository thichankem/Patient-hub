import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { dashboardQuerySchema } from './manager.schema';
import * as ctrl from './manager.controller';

const router = Router();
router.use(authenticate, requireRole('manager'));

router.get(
  '/dashboard',
  validate({ query: dashboardQuerySchema }),
  ctrl.dashboard,
);

export default router;
