import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny, infer as ZodInfer } from 'zod';

type Schemas = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

// Validate + ép kiểu req.body/query/params. Lỗi ZodError được errorHandler bắt -> 400.
//
// Express 5: req.query trở thành getter (read-only assign). Object.assign chỉ
// merge — không xóa key cũ. Để tránh kẹt key không qua validate, ta:
//   1. xóa key gốc trước khi gán
//   2. dùng Object.assign vào object cũ (giữ reference)
function replaceProps<T extends object>(target: T, source: Record<string, unknown>): void {
  for (const k of Object.keys(target)) delete (target as Record<string, unknown>)[k];
  Object.assign(target, source);
}

export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.query) {
      replaceProps(req.query as object, schemas.query.parse(req.query));
    }
    if (schemas.params) {
      replaceProps(req.params as object, schemas.params.parse(req.params));
    }
    next();
  };
}

export type Infer<T extends ZodTypeAny> = ZodInfer<T>;
