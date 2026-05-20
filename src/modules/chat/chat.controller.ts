import type { Request, Response } from 'express';
import { AppError } from '../../middleware/error';
import * as svc from './chat.service';
import type { HistoryQuery, SendMessageInput } from './chat.schema';

function actor(req: Request) {
  if (!req.user) throw new AppError(401, 'Chưa xác thực');
  return req.user;
}

export async function send(req: Request, res: Response): Promise<void> {
  const data = await svc.sendMessage(
    req.body as SendMessageInput,
    actor(req),
  );
  res.status(201).json({ data });
}

export async function conversations(req: Request, res: Response): Promise<void> {
  const data = await svc.listConversations(actor(req));
  res.json({ data });
}

export async function history(req: Request, res: Response): Promise<void> {
  const data = await svc.getHistory(
    req.params['peerId'] as string,
    req.query as unknown as HistoryQuery,
    actor(req),
  );
  res.json({ data });
}
