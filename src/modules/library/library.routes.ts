import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  idParamSchema,
  listDiseaseQuerySchema,
  listNameQuerySchema,
  createDiseaseSchema,
  updateDiseaseSchema,
  createMedicineSchema,
  updateMedicineSchema,
  createTestTypeSchema,
  updateTestTypeSchema,
  createProcedureSchema,
  updateProcedureSchema,
} from './library.schema';
import * as libraryController from './library.controller';

const router = Router();
router.use(authenticate);

// ─── Diseases ────────────────────────────────────────────────────────────────

router.get(
  '/diseases',
  validate({ query: listDiseaseQuerySchema }),
  libraryController.listDiseases,
);
router.get(
  '/diseases/:id',
  validate({ params: idParamSchema }),
  libraryController.getDisease,
);
router.post(
  '/diseases',
  requireRole('manager'),
  validate({ body: createDiseaseSchema }),
  libraryController.createDisease,
);
router.patch(
  '/diseases/:id',
  requireRole('manager'),
  validate({ params: idParamSchema, body: updateDiseaseSchema }),
  libraryController.updateDisease,
);
router.delete(
  '/diseases/:id',
  requireRole('manager'),
  validate({ params: idParamSchema }),
  libraryController.deleteDisease,
);

// ─── Medicines ───────────────────────────────────────────────────────────────

router.get(
  '/medicines',
  validate({ query: listNameQuerySchema }),
  libraryController.listMedicines,
);
router.get(
  '/medicines/:id',
  validate({ params: idParamSchema }),
  libraryController.getMedicine,
);
router.post(
  '/medicines',
  requireRole('manager'),
  validate({ body: createMedicineSchema }),
  libraryController.createMedicine,
);
router.patch(
  '/medicines/:id',
  requireRole('manager'),
  validate({ params: idParamSchema, body: updateMedicineSchema }),
  libraryController.updateMedicine,
);
router.delete(
  '/medicines/:id',
  requireRole('manager'),
  validate({ params: idParamSchema }),
  libraryController.deleteMedicine,
);

// ─── Test Types ───────────────────────────────────────────────────────────────

router.get(
  '/test-types',
  validate({ query: listNameQuerySchema }),
  libraryController.listTestTypes,
);
router.get(
  '/test-types/:id',
  validate({ params: idParamSchema }),
  libraryController.getTestType,
);
router.post(
  '/test-types',
  requireRole('manager'),
  validate({ body: createTestTypeSchema }),
  libraryController.createTestType,
);
router.patch(
  '/test-types/:id',
  requireRole('manager'),
  validate({ params: idParamSchema, body: updateTestTypeSchema }),
  libraryController.updateTestType,
);
router.delete(
  '/test-types/:id',
  requireRole('manager'),
  validate({ params: idParamSchema }),
  libraryController.deleteTestType,
);

// ─── Procedures ──────────────────────────────────────────────────────────────

router.get(
  '/procedures',
  validate({ query: listNameQuerySchema }),
  libraryController.listProcedures,
);
router.get(
  '/procedures/:id',
  validate({ params: idParamSchema }),
  libraryController.getProcedure,
);
router.post(
  '/procedures',
  requireRole('manager'),
  validate({ body: createProcedureSchema }),
  libraryController.createProcedure,
);
router.patch(
  '/procedures/:id',
  requireRole('manager'),
  validate({ params: idParamSchema, body: updateProcedureSchema }),
  libraryController.updateProcedure,
);
router.delete(
  '/procedures/:id',
  requireRole('manager'),
  validate({ params: idParamSchema }),
  libraryController.deleteProcedure,
);

export default router;
