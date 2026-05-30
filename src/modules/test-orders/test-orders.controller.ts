import type { Request, Response } from 'express';
import { AppError } from '../../middleware/error';
import * as svc from './test-orders.service';
import type {
  CreateTestOrderInput,
  UpdateItemStatusInput,
} from './test-orders.schema';

function actor(req: Request) {
  if (!req.user) throw new AppError(401, 'Chưa xác thực');
  return req.user;
}

export async function createTestOrder(req: Request, res: Response): Promise<void> {
  const data = await svc.createTestOrder(
    req.body as CreateTestOrderInput,
    actor(req),
  );
  res.status(201).json({ data });
}

export async function getTestOrderDetail(req: Request, res: Response): Promise<void> {
  const data = await svc.getTestOrderDetail(
    req.params['id'] as string,
    actor(req),
  );
  res.json({ data });
}

export async function listBySession(req: Request, res: Response): Promise<void> {
  const data = await svc.listBySession(
    req.query['session_id'] as string,
    actor(req),
  );
  res.json({ data });
}

export async function listMineForDoctor(req: Request, res: Response): Promise<void> {
  const data = await svc.listMineForDoctor(actor(req));
  res.json({ data });
}

export async function listMySchedule(req: Request, res: Response): Promise<void> {
  const data = await svc.listMySchedule(actor(req));
  res.json({ data });
}

export async function technicianQueue(req: Request, res: Response): Promise<void> {
  const data = await svc.technicianQueue(actor(req));
  res.json({ data });
}

export async function updateItemStatus(req: Request, res: Response): Promise<void> {
  const data = await svc.updateItemStatus(
    req.params['itemId'] as string,
    req.body as UpdateItemStatusInput,
    actor(req),
  );
  res.json({ data });
}

export async function cancelItem(req: Request, res: Response): Promise<void> {
  const data = await svc.cancelItem(req.params['itemId'] as string, actor(req));
  res.json({ data });
}

export async function reviewItem(req: Request, res: Response): Promise<void> {
  const data = await svc.reviewItem(req.params['itemId'] as string, actor(req));
  res.json({ data });
}
