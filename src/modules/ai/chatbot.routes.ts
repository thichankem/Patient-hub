import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  askLibrarySchema,
  suggestDoctorSchema,
  symptomQuerySchema,
} from './chatbot.schema';
import * as ctrl from './chatbot.controller';

const router = Router();
router.use(authenticate);

router.get(
  '/symptoms',
  requireRole('patient'),
  validate({ query: symptomQuerySchema }),
  ctrl.symptoms,
);

router.get(
  '/library',
  requireRole('patient'),
  validate({ query: askLibrarySchema }),
  ctrl.library,
);

router.get(
  '/suggest-doctor',
  requireRole('patient'),
  validate({ query: suggestDoctorSchema }),
  ctrl.suggestDoctor,
);

export default router;
