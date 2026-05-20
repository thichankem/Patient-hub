import { queryOne } from '../../db/query';
import type { UserRow } from '../../types/db';
import { AppError } from '../../middleware/error';
import { generatePassword, hashPassword, verifyPassword } from '../../utils/password';
import { signToken } from '../../utils/jwt';
import { sendSms } from '../../utils/sms';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
} from './auth.schema';

interface PublicUser {
  id: string;
  username: string;
  role: UserRow['role'];
}

function toPublic(u: UserRow): PublicUser {
  return { id: u.id, username: u.username, role: u.role };
}

export async function login(
  input: LoginInput,
): Promise<{ token: string; user: PublicUser }> {
  const user = await queryOne<UserRow>(
    'SELECT * FROM users WHERE username = $1',
    [input.username],
  );
  // Thông báo chung để không lộ username có tồn tại hay không.
  if (!user) throw new AppError(401, 'Sai tài khoản hoặc mật khẩu');
  if (!user.is_active) throw new AppError(403, 'Tài khoản đã bị khóa');

  const ok = await verifyPassword(input.password, user.password_hash);
  if (!ok) throw new AppError(401, 'Sai tài khoản hoặc mật khẩu');

  const token = signToken({
    sub: user.id,
    username: user.username,
    role: user.role,
  });
  return { token, user: toPublic(user) };
}

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await queryOne<UserRow>(
    'SELECT * FROM users WHERE id = $1',
    [userId],
  );
  if (!user) throw new AppError(404, 'Người dùng không tồn tại');
  return toPublic(user);
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<void> {
  const user = await queryOne<UserRow>(
    'SELECT * FROM users WHERE id = $1',
    [userId],
  );
  if (!user) throw new AppError(404, 'Người dùng không tồn tại');

  const ok = await verifyPassword(input.oldPassword, user.password_hash);
  if (!ok) throw new AppError(400, 'Mật khẩu cũ không đúng');

  const newHash = await hashPassword(input.newPassword);
  await queryOne(
    'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id',
    [newHash, userId],
  );
}

// Quên mật khẩu — chỉ áp dụng cho bệnh nhân (username = SĐT theo nghiệp vụ).
// Để tránh leak username tồn tại hay không, luôn trả 200 dù không tìm thấy.
export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  const user = await queryOne<UserRow>(
    `SELECT * FROM users WHERE username = $1 AND role = 'patient'`,
    [input.phone],
  );
  if (!user || !user.is_active) return;

  const newPassword = generatePassword();
  const newHash = await hashPassword(newPassword);
  await queryOne(
    'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id',
    [newHash, user.id],
  );
  sendSms(input.phone, `Mật khẩu mới của bạn: ${newPassword}`);
}
