import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid('ID không hợp lệ'),
});

export const generateInvoiceSchema = z.object({
  session_id: z.string().uuid('session_id không hợp lệ'),
});

// Bắt buộc nhập số tiền cashier nhận thực tế — kiểm tra >= final_amount
// trong service để chống gian lận nội bộ.
export const payCashSchema = z.object({
  received_amount: z.number().nonnegative('Số tiền nhận không hợp lệ'),
});

// VNPay cho phép truyền vnp_BankCode để pre-select cổng (NCB, VNBANK, INTCARD...).
// Bỏ trống = hiện màn hình chọn ngân hàng của VNPay.
export const payVnpaySchema = z.object({
  bank_code: z.string().min(2).max(20).optional(),
});

export type PayVnpayInput = z.infer<typeof payVnpaySchema>;

export const listQuerySchema = z.object({
  patient_id: z.string().uuid().optional(),
  payment_status: z.enum(['pending', 'paid']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const revenueQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;
export type PayCashInput = z.infer<typeof payCashSchema>;
export type ListInvoiceQuery = z.infer<typeof listQuerySchema>;
export type RevenueQuery = z.infer<typeof revenueQuerySchema>;
