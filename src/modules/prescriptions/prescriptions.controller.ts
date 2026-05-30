import type { Request, Response } from 'express';
import { AppError } from '../../middleware/error';
import * as svc from './prescriptions.service';
import type {
  CreatePrescriptionInput,
  UpdatePrescriptionInput,
} from './prescriptions.schema';

function actor(req: Request) {
  if (!req.user) throw new AppError(401, 'Chưa xác thực');
  return req.user;
}

export async function createPrescription(req: Request, res: Response): Promise<void> {
  const data = await svc.createPrescription(
    req.body as CreatePrescriptionInput,
    actor(req),
  );
  res.status(201).json({ data });
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

export async function getPrescription(req: Request, res: Response): Promise<void> {
  const data = await svc.getPrescription(
    req.params['id'] as string,
    actor(req),
  );
  res.json({ data });
}

export async function updatePrescription(req: Request, res: Response): Promise<void> {
  const data = await svc.updatePrescription(
    req.params['id'] as string,
    req.body as UpdatePrescriptionInput,
    actor(req),
  );
  res.json({ data });
}
