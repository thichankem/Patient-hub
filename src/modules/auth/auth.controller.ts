import type { Request, Response } from 'express';
import { AppError } from '../../middleware/error';
import * as authService from './auth.service';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
} from './auth.schema';

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body as LoginInput);
  res.json(result);
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError(401, 'Chưa xác thực');
  const user = await authService.getMe(req.user.sub);
  res.json({ user });
}

export async function changePassword(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) throw new AppError(401, 'Chưa xác thực');
  await authService.changePassword(
    req.user.sub,
    req.body as ChangePasswordInput,
  );
  res.json({ message: 'Đổi mật khẩu thành công' });
}

export async function forgotPassword(
  req: Request,
  res: Response,
): Promise<void> {
  await authService.forgotPassword(req.body as ForgotPasswordInput, req.ip ?? null);
  // Luôn trả message giống nhau, không phân biệt số có tồn tại hay không.
  res.json({
    message: 'Nếu số điện thoại tồn tại trong hệ thống, mật khẩu mới sẽ được gửi qua SMS.',
  });
}
