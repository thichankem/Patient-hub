import type { Request, Response } from 'express';
import { AppError } from '../../middleware/error';
import * as svc from './manager.service';
import type { DashboardQuery } from './manager.schema';

function actor(req: Request) {
  if (!req.user) throw new AppError(401, 'Chưa xác thực');
  return req.user;
}

export async function dashboard(req: Request, res: Response): Promise<void> {
  const data = await svc.getDashboard(
    req.query as unknown as DashboardQuery,
    actor(req),
  );
  res.json({ data });
}
