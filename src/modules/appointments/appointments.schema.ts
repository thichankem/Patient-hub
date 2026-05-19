import { z } from 'zod';

const futureDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày hẹn phải có dạng YYYY-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Ngày hẹn không hợp lệ')
  .refine((v) => {
    const today = new Date().toISOString().slice(0, 10);
    return v >= today;
  }, 'Ngày hẹn không được ở quá khứ');

export const idParamSchema = z.object({
  id: z.string().uuid('ID không hợp lệ'),
});

export const listAppointmentQuerySchema = z.object({
  status: z
    .enum([
      'pending',
      'confirmed',
      'in_progress',
      'done',
      'cancelled',
      'expired',
    ])
    .optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  all: z.enum(['true', 'false']).optional(),
});

// Bệnh nhân đặt qua chatbot: cung cấp triệu chứng + (khoa đã xác nhận/tự chọn)
// + ngày rảnh. Hệ thống tự chọn bác sĩ cân tải.
// Tiếp tân/Quản lý tạo: chỉ định patient_id, có thể chỉ định doctor_id.
export const createAppointmentSchema = z
  .object({
    patient_id: z.string().uuid().optional(),
    department_id: z.string().uuid().optional(),
    doctor_id: z.string().uuid().optional(),
    appointment_date: futureDate,
    symptoms: z.string().optional(),
  })
  .refine((d) => d.department_id || d.doctor_id, {
    message: 'Cần department_id (tự chọn bác sĩ) hoặc doctor_id (chỉ định)',
    path: ['department_id'],
  });

export const reassignSchema = z.object({
  doctor_id: z.string().uuid('doctor_id không hợp lệ'),
});

export type ListAppointmentQuery = z.infer<typeof listAppointmentQuerySchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type ReassignInput = z.infer<typeof reassignSchema>;
