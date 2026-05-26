import type { Request, Response } from 'express';
import type { ReturnQueryFromVNPay } from 'vnpay';
import { AppError } from '../../middleware/error';
import { clientIp, isIpAllowed, isPayosIpAllowed, VnpIpn } from '../../integrations/vnpay';
import type { PayosWebhook } from '../../integrations/payos';
import { logger } from '../../utils/logger';
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
  const bankCode = typeof req.body?.bank_code === 'string'
    ? (req.body.bank_code as string)
    : undefined;
  const data = await svc.payVnpay(
    req.params['id'] as string,
    actor(req),
    clientIp(req),
    bankCode,
  );
  res.json({ data });
}

// Browser redirect — không yêu cầu auth, không tin để mark paid.
export async function vnpayReturn(req: Request, res: Response): Promise<void> {
  const data = await svc.handleVnpayReturn(
    req.query as unknown as ReturnQueryFromVNPay,
  );
  res.json({ data });
}

// ─── PayOS ─────────────────────────────────────────────────────────────────

export async function payPayos(req: Request, res: Response): Promise<void> {
  const data = await svc.payPayos(req.params['id'] as string, actor(req));
  res.json({ data });
}

// Webhook PayOS — public, server-to-server.
// PayOS expect HTTP 200 với JSON; chữ ký sai vẫn trả 200 để tránh PayOS retry mãi.
export async function payosWebhook(req: Request, res: Response): Promise<void> {
  // IP whitelist (chỉ áp dụng nếu PAYOS_ALLOWED_IPS được cấu hình).
  if (!isPayosIpAllowed(clientIp(req))) {
    logger.warn({ ip: clientIp(req) }, 'PayOS webhook từ IP ngoài whitelist');
    res.json({ error: 1, message: 'IP không được phép' });
    return;
  }
  try {
    const result = await svc.handlePayosWebhook(req.body as PayosWebhook);
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'PayOS webhook handler crash');
    res.json({ error: 1, message: 'Unknown error' });
  }
}

// IPN — server-to-server. Trả về EXACTLY format VNPay expects.
export async function vnpayIpn(req: Request, res: Response): Promise<void> {
  // Optional IP whitelist — bật bằng VNP_ALLOWED_IPS.
  if (!isIpAllowed(clientIp(req))) {
    res.json({ RspCode: '99', Message: 'IP không được phép' });
    return;
  }
  try {
    const result = await svc.handleVnpayIpn(
      req.query as unknown as ReturnQueryFromVNPay,
    );
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'VNPay IPN handler crash');
    res.json(VnpIpn.UnknownError);
  }
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
