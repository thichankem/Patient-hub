import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createDepartmentSchema,
  idParamSchema,
  updateDepartmentSchema,
} from './departments.schema';
import * as departmentsController from './departments.controller';

const router = Router();
router.use(authenticate);

router.get('/', departmentsController.listDepartments);
router.get(
  '/:id',
  validate({ params: idParamSchema }),
  departmentsController.getDepartment,
);

router.post(
  '/',
  requireRole('manager'),
  validate({ body: createDepartmentSchema }),
  departmentsController.createDepartment,
);

router.patch(
  '/:id',
  requireRole('manager'),
  validate({ params: idParamSchema, body: updateDepartmentSchema }),
  departmentsController.updateDepartment,
);

router.delete(
  '/:id',
  requireRole('manager'),
  validate({ params: idParamSchema }),
  departmentsController.deleteDepartment,
);

export default router;
