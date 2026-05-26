import { z } from 'zod';

const phone = z
  .string()
  .regex(/^0\d{9}$/, 'Số điện thoại phải gồm 10 chữ số bắt đầu bằng 0');

const dateStr = (label: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} phải có dạng YYYY-MM-DD`)
    .refine((v) => !Number.isNaN(Date.parse(v)), `${label} không hợp lệ`);

const gender = z.enum(['male', 'female', 'other']);
const priority = z.enum(['1', '2', '3', '4', '5']);

export const idParamSchema = z.object({
  id: z.string().uuid('ID không hợp lệ'),
});

export const listPatientQuerySchema = z.object({
  name: z.string().optional(),
});

export const createPatientSchema = z.object({
  full_name: z.string().min(1, 'Họ tên không được để trống').max(255),
  date_of_birth: dateStr('Ngày sinh'),
  gender,
  blood_type: z.string().max(5).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  phone,
  insurance_number: z.string().min(1).max(50).nullable().optional(),
  insurance_expiry: dateStr('Hạn bảo hiểm').nullable().optional(),
  priority_type: priority.nullable().optional(),
});

// Sửa thông tin cần mật khẩu hiện tại của bệnh nhân (theo đặc tả).
// Phải có ít nhất 1 trường ngoài currentPassword.
export const updatePatientSchema = z
  .object({
    currentPassword: z.string().min(1, 'Cần mật khẩu hiện tại của bệnh nhân'),
    full_name: z.string().min(1).max(255).optional(),
    date_of_birth: dateStr('Ngày sinh').optional(),
    gender: gender.optional(),
    blood_type: z.string().max(5).nullable().optional(),
    address: z.string().max(500).nullable().optional(),
    phone: phone.optional(),
    insurance_number: z.string().min(1).max(50).nullable().optional(),
    insurance_expiry: dateStr('Hạn bảo hiểm').nullable().optional(),
    priority_type: priority.nullable().optional(),
  })
  .refine(
    (d) => {
      const { currentPassword: _cp, ...rest } = d;
      return Object.values(rest).some((v) => v !== undefined);
    },
    { message: 'Cần ít nhất 1 trường để cập nhật' },
  );

export type ListPatientQuery = z.infer<typeof listPatientQuerySchema>;
export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
