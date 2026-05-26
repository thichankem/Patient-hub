import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createBasicStaffSchema,
  createDoctorSchema,
  createTechnicianSchema,
  idParamSchema,
  listAccountsQuerySchema,
  setActiveSchema,
  updateDoctorSchema,
  updateTechnicianSchema,
  userIdParamSchema,
} from './staff.schema';
import * as staffController from './staff.controller';

const router = Router();

// Toàn bộ module chỉ dành cho quản lý.
router.use(authenticate, requireRole('manager'));

// ─── Accounts ────────────────────────────────────────────────────────────────

router.get(
  '/accounts',
  validate({ query: listAccountsQuerySchema }),
  staffController.listAccounts,
);
router.patch(
  '/accounts/:userId',
  validate({ params: userIdParamSchema, body: setActiveSchema }),
  staffController.setAccountActive,
);

// Manager reset mật khẩu cho staff (doctor/technician/cashier/receptionist).
// Trả về mật khẩu mới — manager đọc và đưa tận tay nhân viên.
router.post(
  '/accounts/:userId/reset-password',
  validate({ params: userIdParamSchema }),
  staffController.resetStaffPassword,
);

// ─── Doctors ─────────────────────────────────────────────────────────────────

router.get('/doctors', staffController.listDoctors);
router.post(
  '/doctors',
  validate({ body: createDoctorSchema }),
  staffController.createDoctor,
);
router.get(
  '/doctors/:id',
  validate({ params: idParamSchema }),
  staffController.getDoctor,
);
router.patch(
  '/doctors/:id',
  validate({ params: idParamSchema, body: updateDoctorSchema }),
  staffController.updateDoctor,
);

// ─── Technicians ─────────────────────────────────────────────────────────────

router.get('/technicians', staffController.listTechnicians);
router.post(
  '/technicians',
  validate({ body: createTechnicianSchema }),
  staffController.createTechnician,
);
router.get(
  '/technicians/:id',
  validate({ params: idParamSchema }),
  staffController.getTechnician,
);
router.patch(
  '/technicians/:id',
  validate({ params: idParamSchema, body: updateTechnicianSchema }),
  staffController.updateTechnician,
);

// ─── Cashier / Receptionist ──────────────────────────────────────────────────

router.post(
  '/cashiers',
  validate({ body: createBasicStaffSchema }),
  staffController.createCashier,
);
router.post(
  '/receptionists',
  validate({ body: createBasicStaffSchema }),
  staffController.createReceptionist,
);

export default router;
