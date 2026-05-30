import type { Request, Response } from 'express';
import { AppError } from '../../middleware/error';
import * as svc from './examination.service';
import type { UpdateSessionInput } from './examination.schema';

function actor(req: Request) {
  if (!req.user) throw new AppError(401, 'Chưa xác thực');
  return req.user;
}

export async function getSessionDetail(req: Request, res: Response): Promise<void> {
  const data = await svc.getSessionDetail(req.params['id'] as string, actor(req));
  res.json({ data });
}

export async function listMySessions(req: Request, res: Response): Promise<void> {
  const data = await svc.listMySessions(actor(req));
  res.json({ data });
}

export async function listDoctorSessions(req: Request, res: Response): Promise<void> {
  const includeFinalized = req.query['includeFinalized'] === 'true';
  const data = await svc.listDoctorSessions(actor(req), { includeFinalized });
  res.json({ data });
}

export async function listByPatient(req: Request, res: Response): Promise<void> {
  const data = await svc.listSessionsByPatient(
    req.params['patientId'] as string,
    actor(req),
  );
  res.json({ data });
}

export async function myMedicalHistory(req: Request, res: Response): Promise<void> {
  const data = await svc.getMyMedicalHistory(actor(req));
  res.json({ data });
}

export async function patientMedicalHistory(
  req: Request,
  res: Response,
): Promise<void> {
  if (actor(req).role !== 'doctor')
    throw new AppError(403, 'Chỉ bác sĩ được tra cứu');
  const data = await svc.getMedicalHistory(req.params['patientId'] as string);
  res.json({ data });
}

export async function updateSession(req: Request, res: Response): Promise<void> {
  const data = await svc.updateSession(
    req.params['id'] as string,
    actor(req),
    req.body as UpdateSessionInput,
  );
  res.json({ data });
}

export async function finalizeSession(req: Request, res: Response): Promise<void> {
  const data = await svc.finalizeSession(req.params['id'] as string, actor(req));
  res.json({ data });
}
