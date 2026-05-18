import type { Request, Response } from 'express';
import * as libraryService from './library.service';
import type {
  CreateDiseaseInput,
  UpdateDiseaseInput,
  ListDiseaseQuery,
  CreateMedicineInput,
  UpdateMedicineInput,
  CreateTestTypeInput,
  UpdateTestTypeInput,
  CreateProcedureInput,
  UpdateProcedureInput,
  ListNameQuery,
} from './library.schema';

// ─── Diseases ────────────────────────────────────────────────────────────────

export async function listDiseases(req: Request, res: Response): Promise<void> {
  const data = await libraryService.listDiseases(req.query as ListDiseaseQuery);
  res.json({ data });
}

export async function getDisease(req: Request, res: Response): Promise<void> {
  const data = await libraryService.getDisease(req.params['id'] as string);
  res.json({ data });
}

export async function createDisease(req: Request, res: Response): Promise<void> {
  const data = await libraryService.createDisease(req.body as CreateDiseaseInput);
  res.status(201).json({ data });
}

export async function updateDisease(req: Request, res: Response): Promise<void> {
  const data = await libraryService.updateDisease(
    req.params['id'] as string,
    req.body as UpdateDiseaseInput,
  );
  res.json({ data });
}

export async function deleteDisease(req: Request, res: Response): Promise<void> {
  await libraryService.deleteDisease(req.params['id'] as string);
  res.json({ message: 'Xóa bệnh thành công' });
}

// ─── Medicines ───────────────────────────────────────────────────────────────

export async function listMedicines(req: Request, res: Response): Promise<void> {
  const data = await libraryService.listMedicines(req.query as ListNameQuery);
  res.json({ data });
}

export async function getMedicine(req: Request, res: Response): Promise<void> {
  const data = await libraryService.getMedicine(req.params['id'] as string);
  res.json({ data });
}

export async function createMedicine(req: Request, res: Response): Promise<void> {
  const data = await libraryService.createMedicine(req.body as CreateMedicineInput);
  res.status(201).json({ data });
}

export async function updateMedicine(req: Request, res: Response): Promise<void> {
  const data = await libraryService.updateMedicine(
    req.params['id'] as string,
    req.body as UpdateMedicineInput,
  );
  res.json({ data });
}

export async function deleteMedicine(req: Request, res: Response): Promise<void> {
  await libraryService.deleteMedicine(req.params['id'] as string);
  res.json({ message: 'Xóa thuốc thành công' });
}

// ─── Test Types ───────────────────────────────────────────────────────────────

export async function listTestTypes(req: Request, res: Response): Promise<void> {
  const data = await libraryService.listTestTypes(req.query as ListNameQuery);
  res.json({ data });
}

export async function getTestType(req: Request, res: Response): Promise<void> {
  const data = await libraryService.getTestType(req.params['id'] as string);
  res.json({ data });
}

export async function createTestType(req: Request, res: Response): Promise<void> {
  const data = await libraryService.createTestType(req.body as CreateTestTypeInput);
  res.status(201).json({ data });
}

export async function updateTestType(req: Request, res: Response): Promise<void> {
  const data = await libraryService.updateTestType(
    req.params['id'] as string,
    req.body as UpdateTestTypeInput,
  );
  res.json({ data });
}

export async function deleteTestType(req: Request, res: Response): Promise<void> {
  await libraryService.deleteTestType(req.params['id'] as string);
  res.json({ message: 'Xóa loại xét nghiệm thành công' });
}

// ─── Procedures ──────────────────────────────────────────────────────────────

export async function listProcedures(req: Request, res: Response): Promise<void> {
  const data = await libraryService.listProcedures(req.query as ListNameQuery);
  res.json({ data });
}

export async function getProcedure(req: Request, res: Response): Promise<void> {
  const data = await libraryService.getProcedure(req.params['id'] as string);
  res.json({ data });
}

export async function createProcedure(req: Request, res: Response): Promise<void> {
  const data = await libraryService.createProcedure(req.body as CreateProcedureInput);
  res.status(201).json({ data });
}

export async function updateProcedure(req: Request, res: Response): Promise<void> {
  const data = await libraryService.updateProcedure(
    req.params['id'] as string,
    req.body as UpdateProcedureInput,
  );
  res.json({ data });
}

export async function deleteProcedure(req: Request, res: Response): Promise<void> {
  await libraryService.deleteProcedure(req.params['id'] as string);
  res.json({ message: 'Xóa quy trình thành công' });
}
