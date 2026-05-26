import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid('ID không hợp lệ'),
});

export const listQuerySchema = z.object({
  is_read: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const broadcastSchema = z
  .object({
    title: z.string().min(1, 'Tiêu đề bắt buộc').max(255),
    body: z.string().min(1, 'Nội dung bắt buộc').max(2000),
    target_scope: z.enum([
      'single',
      'all_doctors',
      'all_patients',
      'all_system',
    ]),
    recipient_user_id: z.string().uuid().optional(),
  })
  .refine(
    (d) => d.target_scope !== 'single' || !!d.recipient_user_id,
    { message: 'target_scope=single yêu cầu recipient_user_id', path: ['recipient_user_id'] },
  );

export type ListNotificationsQuery = z.infer<typeof listQuerySchema>;
export type BroadcastInput = z.infer<typeof broadcastSchema>;
