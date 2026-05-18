import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';
import type { UserRole } from '../types/db';
import { AppError } from './error';

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError(401, 'Thiếu hoặc sai định dạng token');
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    req.user = verifyToken(token);
  } catch {
    throw new AppError(401, 'Token không hợp lệ hoặc đã hết hạn');
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, 'Chưa xác thực');
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, 'Không có quyền truy cập');
    }
    next();
  };
}
