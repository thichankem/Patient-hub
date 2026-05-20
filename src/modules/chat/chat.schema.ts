import { z } from 'zod';

export const sendMessageSchema = z.object({
  receiver_user_id: z.string().uuid('receiver_user_id không hợp lệ'),
  content: z.string().min(1, 'Nội dung không được rỗng').max(2000),
});

export const peerParamSchema = z.object({
  peerId: z.string().uuid('peerId không hợp lệ'),
});

export const historyQuerySchema = z.object({
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
