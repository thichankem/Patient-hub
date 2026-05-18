import type { Request, Response } from 'express';
import { AppError } from '../../middleware/error';
import * as patientsService from './patients.service';
import type { CreatePatientInput, UpdatePatientInput } from './patients.schema';

export async function createPatient(req: Request, res: Response): Promise<void> {
  const data = await patientsService.createPatient(
    req.body as CreatePatientInput,
  );
  res.status(201).json({ data });
}

export async function listPatients(req: Request, res: Response): Promise<void> {
  const name = typeof req.query.name === 'string' ? req.query.name : undefined;
  const data = await patientsService.listPatients(name);
  res.json({ data });
}

// Bệnh nhân xem hồ sơ của chính mình.
export async function getMyProfile(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError(401, 'Chưa xác thực');
  const data = await patientsService.getPatientByUserId(req.user.sub);
  res.json({ data });
}

export async function getPatient(req: Request, res: Response): Promise<void> {
  const data = await patientsService.getPatientById(req.params['id'] as string);
  res.json({ data });
}

export async function updatePatient(req: Request, res: Response): Promise<void> {
  const data = await patientsService.updatePatient(
    req.params['id'] as string,
    req.body as UpdatePatientInput,
  );
  res.json({ data });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  await patientsService.resetPassword(req.params['id'] as string);
  res.json({ message: 'Đã gửi mật khẩu mới đến số điện thoại bệnh nhân' });
}
