import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid('ID không hợp lệ'),
});

export const itemIdParamSchema = z.object({
  itemId: z.string().uuid('itemId không hợp lệ'),
});

export const listBySessionQuerySchema = z.object({
  session_id: z.string().uuid('session_id không hợp lệ'),
});

export const createTestOrderSchema = z.object({
  session_id: z.string().uuid('session_id không hợp lệ'),
  note: z.string().nullable().optional(),
  test_type_ids: z
    .array(z.string().uuid('test_type_id không hợp lệ'))
    .min(1, 'Cần ít nhất 1 loại xét nghiệm'),
});

// KTV chuyển trạng thái: not_started → waiting → processing → completed.
// Khi completed bắt buộc có result_data, sau đó không sửa được.
export const updateItemStatusSchema = z
  .object({
    status: z.enum(['waiting', 'processing', 'completed']),
    result_data: z.unknown().optional(),
  })
  .refine(
    (d) => d.status !== 'completed' || d.result_data !== undefined,
    { message: 'Cần result_data khi hoàn tất xét nghiệm', path: ['result_data'] },
  );

export type CreateTestOrderInput = z.infer<typeof createTestOrderSchema>;
export type UpdateItemStatusInput = z.infer<typeof updateItemStatusSchema>;
