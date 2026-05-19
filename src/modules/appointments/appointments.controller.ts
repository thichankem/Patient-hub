import type { Request, Response } from 'express';
import { AppError } from '../../middleware/error';
import * as appointmentsService from './appointments.service';
import type {
  CreateAppointmentInput,
  ListAppointmentQuery,
  ReassignInput,
} from './appointments.schema';

function actor(req: Request) {
  if (!req.user) throw new AppError(401, 'Chưa xác thực');
  return req.user;
}

export async function createAppointment(req: Request, res: Response): Promise<void> {
  const data = await appointmentsService.createAppointment(
    req.body as CreateAppointmentInput,
    actor(req),
  );
  res.status(201).json({ data });
}

export async function listAppointments(req: Request, res: Response): Promise<void> {
  const data = await appointmentsService.listAppointments(
    actor(req),
    req.query as ListAppointmentQuery,
  );
  res.json({ data });
}

export async function getAppointment(req: Request, res: Response): Promise<void> {
  const data = await appointmentsService.getAppointment(
    req.params['id'] as string,
    actor(req),
  );
  res.json({ data });
}

export async function startExamination(req: Request, res: Response): Promise<void> {
  const data = await appointmentsService.startExamination(
    req.params['id'] as string,
    actor(req),
  );
  res.json({ data });
}

export async function cancelAppointment(req: Request, res: Response): Promise<void> {
  const data = await appointmentsService.cancelAppointment(
    req.params['id'] as string,
    actor(req),
  );
  res.json({ data });
}

export async function reassignDoctor(req: Request, res: Response): Promise<void> {
  const { doctor_id } = req.body as ReassignInput;
  const data = await appointmentsService.reassignDoctor(
    req.params['id'] as string,
    doctor_id,
    actor(req),
  );
  res.json({ data });
}
