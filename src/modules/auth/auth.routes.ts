import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
} from './auth.schema';
import * as authController from './auth.controller';

const router = Router();

router.post('/login', validate({ body: loginSchema }), authController.login);
router.post(
  '/forgot-password',
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword,
);
router.get('/me', authenticate, authController.me);
router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  authController.changePassword,
);

export default router;
