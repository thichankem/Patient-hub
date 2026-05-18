import { z } from 'zod';

export const createLabRoomSchema = z.object({
  name: z.string().min(1, 'Tên phòng không được để trống').max(100),
  test_type_id: z.string().uuid('test_type_id không hợp lệ'),
});

export const updateLabRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  test_type_id: z.string().uuid().optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid('ID không hợp lệ'),
});

export type CreateLabRoomInput = z.infer<typeof createLabRoomSchema>;
export type UpdateLabRoomInput = z.infer<typeof updateLabRoomSchema>;
