import type { Request, Response } from 'express';
import { AppError } from '../../middleware/error';
import * as svc from './notifications.service';
import type {
  BroadcastInput,
  ListNotificationsQuery,
} from './notifications.schema';

function actor(req: Request) {
  if (!req.user) throw new AppError(401, 'Chưa xác thực');
  return req.user;
}

export async function list(req: Request, res: Response): Promise<void> {
  const data = await svc.listMine(
    req.query as unknown as ListNotificationsQuery,
    actor(req),
  );
  res.json({ data });
}

export async function unreadCount(req: Request, res: Response): Promise<void> {
  const count = await svc.countUnread(actor(req));
  res.json({ data: { count } });
}

export async function markRead(req: Request, res: Response): Promise<void> {
  const data = await svc.markRead(req.params['id'] as string, actor(req));
  res.json({ data });
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  const updated = await svc.markAllRead(actor(req));
  res.json({ data: { updated } });
}

export async function broadcast(req: Request, res: Response): Promise<void> {
  const data = await svc.broadcast(req.body as BroadcastInput, actor(req));
  res.status(201).json({ data });
}
