import type { Request, Response } from 'express';
import * as departmentsService from './departments.service';
import type { CreateDepartmentInput, UpdateDepartmentInput } from './departments.schema';

export async function listDepartments(req: Request, res: Response): Promise<void> {
  const name = typeof req.query.name === 'string' ? req.query.name : undefined;
  const data = await departmentsService.listDepartments(name);
  res.json({ data });
}

export async function getDepartment(req: Request, res: Response): Promise<void> {
  const data = await departmentsService.getDepartment(req.params['id'] as string);
  res.json({ data });
}

export async function createDepartment(req: Request, res: Response): Promise<void> {
  const data = await departmentsService.createDepartment(
    req.body as CreateDepartmentInput,
  );
  res.status(201).json({ data });
}

export async function updateDepartment(req: Request, res: Response): Promise<void> {
  const data = await departmentsService.updateDepartment(
    req.params['id'] as string,
    req.body as UpdateDepartmentInput,
  );
  res.json({ data });
}

export async function deleteDepartment(req: Request, res: Response): Promise<void> {
  await departmentsService.deleteDepartment(req.params['id'] as string);
  res.json({ message: 'Xóa khoa thành công' });
}
