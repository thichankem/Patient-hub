import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid('ID không hợp lệ'),
});

const priceField = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Giá phải là số không âm, tối đa 2 chữ số thập phân');

// ─── Diseases ───────────────────────────────────────────────────────────────

export const createDiseaseSchema = z.object({
  name: z.string().min(1, 'Tên bệnh không được để trống').max(255),
  symptoms: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  treatment: z.string().nullable().optional(),
  department_id: z.string().uuid('department_id không hợp lệ').nullable().optional(),
});

export const updateDiseaseSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  symptoms: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  treatment: z.string().nullable().optional(),
  department_id: z.string().uuid().nullable().optional(),
});

export const listDiseaseQuerySchema = z.object({
  name: z.string().optional(),
  department_id: z.string().uuid().optional(),
});

// ─── Medicines ───────────────────────────────────────────────────────────────

export const createMedicineSchema = z.object({
  name: z.string().min(1, 'Tên thuốc không được để trống').max(255),
  description: z.string().nullable().optional(),
  usage: z.string().nullable().optional(),
  side_effects: z.string().nullable().optional(),
  price: priceField,
  insurance_price: priceField,
});

export const updateMedicineSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  usage: z.string().nullable().optional(),
  side_effects: z.string().nullable().optional(),
  price: priceField.optional(),
  insurance_price: priceField.optional(),
});

// ─── Test Types ───────────────────────────────────────────────────────────────

export const createTestTypeSchema = z.object({
  name: z.string().min(1, 'Tên loại xét nghiệm không được để trống').max(255),
  description: z.string().nullable().optional(),
  estimated_minutes: z.number().int().positive().default(30),
  price: priceField,
  insurance_price: priceField,
});

export const updateTestTypeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  estimated_minutes: z.number().int().positive().optional(),
  price: priceField.optional(),
  insurance_price: priceField.optional(),
});

// ─── Procedures ──────────────────────────────────────────────────────────────

export const createProcedureSchema = z.object({
  name: z.string().min(1, 'Tên quy trình không được để trống').max(255),
  description: z.string().nullable().optional(),
});

export const updateProcedureSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
});

export const listNameQuerySchema = z.object({
  name: z.string().optional(),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreateDiseaseInput = z.infer<typeof createDiseaseSchema>;
export type UpdateDiseaseInput = z.infer<typeof updateDiseaseSchema>;
export type ListDiseaseQuery = z.infer<typeof listDiseaseQuerySchema>;

export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;
export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>;

export type CreateTestTypeInput = z.infer<typeof createTestTypeSchema>;
export type UpdateTestTypeInput = z.infer<typeof updateTestTypeSchema>;

export type CreateProcedureInput = z.infer<typeof createProcedureSchema>;
export type UpdateProcedureInput = z.infer<typeof updateProcedureSchema>;

export type ListNameQuery = z.infer<typeof listNameQuerySchema>;
