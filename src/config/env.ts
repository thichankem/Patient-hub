import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET phải >= 16 ký tự'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  AES_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'AES_KEY phải là 64 ký tự hex (32 bytes)'),

  // VNPay — bắt buộc khi bật thanh toán thật. Ở dev có thể để trống,
  // tích hợp sẽ throw khi gọi nếu thiếu config.
  VNP_TMN_CODE: z.string().optional(),
  VNP_HASH_SECRET: z.string().optional(),
  VNP_HOST: z.string().default('https://sandbox.vnpayment.vn'),
  VNP_RETURN_URL: z
    .string()
    .url()
    .default('http://localhost:3000/api/invoices/vnpay-return'),
  // Whitelist IP cho IPN — bỏ trống = tắt kiểm tra (chỉ dùng dev/test).
  // Production NÊN khai báo: 113.160.92.202,113.52.45.78 (xem docs VNPay).
  VNP_ALLOWED_IPS: z.string().optional(),

  // PayOS — đăng ký kênh thanh toán tại https://my.payos.vn
  // Lấy 3 key trong "Kênh thanh toán" → tab "Thông tin tích hợp".
  PAYOS_CLIENT_ID: z.string().optional(),
  PAYOS_API_KEY: z.string().optional(),
  PAYOS_CHECKSUM_KEY: z.string().optional(),
  PAYOS_RETURN_URL: z
    .string()
    .url()
    .default('http://localhost:3000/api/invoices/payos-return'),
  PAYOS_CANCEL_URL: z
    .string()
    .url()
    .default('http://localhost:3000/api/invoices/payos-cancel'),
  // Whitelist IP cho PayOS webhook — bỏ trống = tắt (dev). Production NÊN khai báo.
  PAYOS_ALLOWED_IPS: z.string().optional(),

  // CORS allowed origins (CSV). Bỏ trống ở dev = '*'; production BẮT BUỘC khai báo.
  CORS_ORIGINS: z.string().optional(),

  // Trust proxy hop count khi deploy sau nginx / cloudfront / cloudflare.
  // 0 = tắt (default), 1 = 1 reverse proxy, ... Quan trọng cho clientIp() đọc X-Forwarded-For.
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),

  // Phí khám mặc định (VNĐ) — quản lý có thể cấu hình.
  DEFAULT_CONSULTATION_FEE: z.coerce.number().int().nonnegative().default(150000),

  // DB pool tuning.
  DB_POOL_MAX: z.coerce.number().int().min(1).max(200).default(20),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(0).default(30_000),

  // Logging.
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Biến môi trường không hợp lệ:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
