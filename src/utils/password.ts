import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const SALT_ROUNDS = 10;

// Sinh mật khẩu ngẫu nhiên gửi cho bệnh nhân qua SMS.
// Bỏ ký tự dễ nhầm (0/O, 1/l/I) cho dễ đọc khi nhận tin nhắn.
export function generatePassword(length = 10): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += charset[bytes[i]! % charset.length];
  }
  return out;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
