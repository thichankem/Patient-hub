import { z } from 'zod';

const username = z.string().min(3, 'Username tối thiểu 3 ký tự').max(100);
const password = z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự');
const fullName = z.string().min(1, 'Họ tên không được để trống').max(255);

export const idParamSchema = z.object({
  id: z.string().uuid('ID không hợp lệ'),
});

export const userIdParamSchema = z.object({
  userId: z.string().uuid('userId không hợp lệ'),
});

export const listAccountsQuerySchema = z.object({
  role: z
    .enum(['patient', 'doctor', 'technician', 'manager', 'cashier', 'receptionist'])
    .optional(),
  is_active: z.enum(['true', 'false']).optional(),
});

export const setActiveSchema = z.object({
  is_active: z.boolean(),
});

export const createDoctorSchema = z.object({
  username,
  password,
  full_name: fullName,
  department_id: z.string().uuid('department_id không hợp lệ'),
});

export const updateDoctorSchema = z.object({
  full_name: fullName.optional(),
  department_id: z.string().uuid().optional(),
  auto_schedule_paused: z.boolean().optional(),
});

export const createTechnicianSchema = z.object({
  username,
  password,
  full_name: fullName,
  lab_room_id: z.string().uuid('lab_room_id không hợp lệ'),
});

export const updateTechnicianSchema = z.object({
  full_name: fullName.optional(),
  lab_room_id: z.string().uuid().optional(),
});

export const createBasicStaffSchema = z.object({
  username,
  password,
});

export type ListAccountsQuery = z.infer<typeof listAccountsQuerySchema>;
export type SetActiveInput = z.infer<typeof setActiveSchema>;
export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type CreateTechnicianInput = z.infer<typeof createTechnicianSchema>;
export type UpdateTechnicianInput = z.infer<typeof updateTechnicianSchema>;
export type CreateBasicStaffInput = z.infer<typeof createBasicStaffSchema>;
