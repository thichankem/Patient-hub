import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const SALT_ROUNDS = 10;

// Sinh mật khẩu ngẫu nhiên gửi cho bệnh nhân qua SMS.
// Bỏ ký tự dễ nhầm (0/O, 1/l/I) cho dễ đọc khi nhận tin nhắn.
// Dùng rejection sampling thay vì modulo để tránh bias (charset 55 ký tự,
// 256 % 55 ≠ 0 → các ký tự đầu charset có xác suất cao hơn).
export function generatePassword(length = 10): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const max = Math.floor(256 / charset.length) * charset.length; // 252 với 55 ký tự
  let out = '';
  while (out.length < length) {
    // Lấy thêm 1 chunk byte; mỗi byte < max thì dùng, ngược lại bỏ.
    const bytes = crypto.randomBytes(length * 2);
    for (let i = 0; i < bytes.length && out.length < length; i++) {
      const b = bytes[i]!;
      if (b < max) out += charset[b % charset.length];
    }
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
