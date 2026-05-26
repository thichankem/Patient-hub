import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid('ID không hợp lệ'),
});

export const patientIdParamSchema = z.object({
  patientId: z.string().uuid('patientId không hợp lệ'),
});

// Bác sĩ chỉ được sửa chẩn đoán + kế hoạch điều trị (dạng text), khi còn nháp.
export const updateSessionSchema = z
  .object({
    diagnosis: z.string().max(5000).nullable().optional(),
    treatment_plan: z.string().max(5000).nullable().optional(),
  })
  .refine((d) => d.diagnosis !== undefined || d.treatment_plan !== undefined, {
    message: 'Không có thông tin cần cập nhật',
  });

export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
