import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid('ID không hợp lệ'),
});

export const createReportSchema = z.object({
  content: z
    .string()
    .min(5, 'Nội dung báo cáo tối thiểu 5 ký tự')
    .max(5000, 'Nội dung báo cáo tối đa 5000 ký tự'),
});

export const listQuerySchema = z.object({
  status: z.enum(['pending', 'resolved']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ListReportsQuery = z.infer<typeof listQuerySchema>;
