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
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Biến môi trường không hợp lệ:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
