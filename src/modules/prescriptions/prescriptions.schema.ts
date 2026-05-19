import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid('ID không hợp lệ'),
});

export const listQuerySchema = z.object({
  session_id: z.string().uuid('session_id không hợp lệ'),
});

const itemSchema = z.object({
  medicine_id: z.string().uuid('medicine_id không hợp lệ'),
  quantity: z.number().int().positive('Số lượng phải > 0'),
  usage_instruction: z.string().nullable().optional(),
});

export const createPrescriptionSchema = z.object({
  session_id: z.string().uuid('session_id không hợp lệ'),
  general_note: z.string().nullable().optional(),
  items: z.array(itemSchema).min(1, 'Đơn thuốc cần ít nhất 1 loại thuốc'),
});

export const updatePrescriptionSchema = z
  .object({
    general_note: z.string().nullable().optional(),
    items: z.array(itemSchema).min(1).optional(),
  })
  .refine((d) => d.general_note !== undefined || d.items !== undefined, {
    message: 'Không có thông tin cần cập nhật',
  });

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type UpdatePrescriptionInput = z.infer<typeof updatePrescriptionSchema>;
