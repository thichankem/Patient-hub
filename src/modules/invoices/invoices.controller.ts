import type { Request, Response } from 'express';
import { AppError } from '../../middleware/error';
import * as svc from './invoices.service';
import type {
  GenerateInvoiceInput,
  ListInvoiceQuery,
  PayCashInput,
  RevenueQuery,
} from './invoices.schema';

function actor(req: Request) {
  if (!req.user) throw new AppError(401, 'Chưa xác thực');
  return req.user;
}

export async function generate(req: Request, res: Response): Promise<void> {
  const data = await svc.generateInvoice(
    req.body as GenerateInvoiceInput,
    actor(req),
  );
  res.status(201).json({ data });
}

export async function payVnpay(req: Request, res: Response): Promise<void> {
  const data = await svc.payVnpay(req.params['id'] as string, actor(req));
  res.json({ data });
}

export async function payCash(req: Request, res: Response): Promise<void> {
  const data = await svc.payCash(
    req.params['id'] as string,
    req.body as PayCashInput,
    actor(req),
  );
  res.json({ data });
}

export async function get(req: Request, res: Response): Promise<void> {
  const data = await svc.getInvoice(req.params['id'] as string, actor(req));
  res.json({ data });
}

export async function list(req: Request, res: Response): Promise<void> {
  const data = await svc.listInvoices(
    req.query as unknown as ListInvoiceQuery,
    actor(req),
  );
  res.json({ data });
}

export async function revenue(req: Request, res: Response): Promise<void> {
  const data = await svc.getRevenue(
    req.query as unknown as RevenueQuery,
    actor(req),
  );
  res.json({ data });
}
