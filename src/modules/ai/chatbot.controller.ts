import type { Request, Response } from 'express';
import { AppError } from '../../middleware/error';
import * as svc from './chatbot.service';
import type {
  AskLibraryQuery,
  SuggestDoctorQuery,
  SymptomQuery,
} from './chatbot.schema';

function actor(req: Request) {
  if (!req.user) throw new AppError(401, 'Chưa xác thực');
  return req.user;
}

export async function symptoms(req: Request, res: Response): Promise<void> {
  const data = await svc.analyzeSymptoms(
    req.query as unknown as SymptomQuery,
    actor(req),
  );
  res.json({ data });
}

export async function library(req: Request, res: Response): Promise<void> {
  const data = await svc.askLibrary(req.query as unknown as AskLibraryQuery);
  res.json({ data });
}

export async function suggestDoctor(req: Request, res: Response): Promise<void> {
  const data = await svc.suggestDoctor(
    req.query as unknown as SuggestDoctorQuery,
    actor(req),
  );
  res.json({ data });
}
