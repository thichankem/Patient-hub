import { z } from 'zod';

export const symptomQuerySchema = z.object({
  symptoms: z.string().min(3, 'Vui lòng mô tả triệu chứng (tối thiểu 3 ký tự)'),
});

export const askLibrarySchema = z.object({
  topic: z.enum(['disease', 'medicine', 'procedure', 'test_type']),
  q: z.string().min(1, 'Cần từ khóa tìm kiếm'),
});

export const suggestDoctorSchema = z.object({
  department_id: z.string().uuid('department_id không hợp lệ'),
  appointment_date: z.string().date('Ngày không hợp lệ'),
});

export type SymptomQuery = z.infer<typeof symptomQuerySchema>;
export type AskLibraryQuery = z.infer<typeof askLibrarySchema>;
export type SuggestDoctorQuery = z.infer<typeof suggestDoctorSchema>;
