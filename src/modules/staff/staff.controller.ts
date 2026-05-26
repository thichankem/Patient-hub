import type { Request, Response } from 'express';
import { AppError } from '../../middleware/error';
import * as staffService from './staff.service';
import type {
  CreateBasicStaffInput,
  CreateDoctorInput,
  CreateTechnicianInput,
  ListAccountsQuery,
  SetActiveInput,
  UpdateDoctorInput,
  UpdateTechnicianInput,
} from './staff.schema';

// ─── Accounts ────────────────────────────────────────────────────────────────

export async function listAccounts(req: Request, res: Response): Promise<void> {
  const data = await staffService.listAccounts(req.query as ListAccountsQuery);
  res.json({ data });
}

export async function setAccountActive(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError(401, 'Chưa xác thực');
  const { is_active } = req.body as SetActiveInput;
  const data = await staffService.setAccountActive(
    req.params['userId'] as string,
    req.user.sub,
    is_active,
  );
  res.json({ data });
}

// ─── Doctors ─────────────────────────────────────────────────────────────────

export async function createDoctor(req: Request, res: Response): Promise<void> {
  const data = await staffService.createDoctor(req.body as CreateDoctorInput);
  res.status(201).json({ data });
}

export async function listDoctors(_req: Request, res: Response): Promise<void> {
  const data = await staffService.listDoctors();
  res.json({ data });
}

export async function getDoctor(req: Request, res: Response): Promise<void> {
  const data = await staffService.getDoctor(req.params['id'] as string);
  res.json({ data });
}

export async function updateDoctor(req: Request, res: Response): Promise<void> {
  const data = await staffService.updateDoctor(
    req.params['id'] as string,
    req.body as UpdateDoctorInput,
  );
  res.json({ data });
}

// ─── Technicians ─────────────────────────────────────────────────────────────

export async function createTechnician(req: Request, res: Response): Promise<void> {
  const data = await staffService.createTechnician(
    req.body as CreateTechnicianInput,
  );
  res.status(201).json({ data });
}

export async function listTechnicians(_req: Request, res: Response): Promise<void> {
  const data = await staffService.listTechnicians();
  res.json({ data });
}

export async function getTechnician(req: Request, res: Response): Promise<void> {
  const data = await staffService.getTechnician(req.params['id'] as string);
  res.json({ data });
}

export async function updateTechnician(req: Request, res: Response): Promise<void> {
  const data = await staffService.updateTechnician(
    req.params['id'] as string,
    req.body as UpdateTechnicianInput,
  );
  res.json({ data });
}

// ─── Cashier / Receptionist ──────────────────────────────────────────────────

export async function createCashier(req: Request, res: Response): Promise<void> {
  const data = await staffService.createCashier(
    req.body as CreateBasicStaffInput,
  );
  res.status(201).json({ data });
}

export async function createReceptionist(
  req: Request,
  res: Response,
): Promise<void> {
  const data = await staffService.createReceptionist(
    req.body as CreateBasicStaffInput,
  );
  res.status(201).json({ data });
}

export async function resetStaffPassword(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) throw new AppError(401, 'Chưa xác thực');
  const data = await staffService.resetStaffPassword(
    req.params['userId'] as string,
    req.user.sub,
  );
  res.json({ data });
}
