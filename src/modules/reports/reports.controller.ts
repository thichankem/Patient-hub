import type { Request, Response } from 'express';
import { AppError } from '../../middleware/error';
import * as svc from './reports.service';
import type {
  CreateReportInput,
  ListReportsQuery,
} from './reports.schema';

function actor(req: Request) {
  if (!req.user) throw new AppError(401, 'Chưa xác thực');
  return req.user;
}

export async function create(req: Request, res: Response): Promise<void> {
  const data = await svc.createReport(
    req.body as CreateReportInput,
    actor(req),
  );
  res.status(201).json({ data });
}

export async function list(req: Request, res: Response): Promise<void> {
  const data = await svc.listReports(
    req.query as unknown as ListReportsQuery,
    actor(req),
  );
  res.json({ data });
}

export async function get(req: Request, res: Response): Promise<void> {
  const data = await svc.getReport(req.params['id'] as string, actor(req));
  res.json({ data });
}

export async function resolve(req: Request, res: Response): Promise<void> {
  const data = await svc.resolveReport(req.params['id'] as string, actor(req));
  res.json({ data });
}
