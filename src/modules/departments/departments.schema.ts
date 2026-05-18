import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Tên khoa không được để trống').max(255),
  description: z.string().nullable().optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid('ID không hợp lệ'),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
