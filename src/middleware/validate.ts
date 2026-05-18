import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny, infer as ZodInfer } from 'zod';

type Schemas = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

// Validate + ép kiểu req.body/query/params. Lỗi ZodError được errorHandler bắt -> 400.
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.query) {
      Object.assign(req.query, schemas.query.parse(req.query));
    }
    if (schemas.params) {
      Object.assign(req.params, schemas.params.parse(req.params));
    }
    next();
  };
}

export type Infer<T extends ZodTypeAny> = ZodInfer<T>;
