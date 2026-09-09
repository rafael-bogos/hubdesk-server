import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../../../../domain/errors/app-error';

const formatIssues = (error: { issues: { path: (string | number)[]; message: string }[] }) =>
  error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');

export const validate = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return next(new AppError(`Dados inválidos: ${formatIssues(result.error)}`, 400));
    }

    req.body = result.data;
    next();
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return next(new AppError(`Parâmetros inválidos: ${formatIssues(result.error)}`, 400));
    }

    // No Express 5, `query` é um getter-only herdado do protótipo — nem
    // `Object.assign(req.query, ...)` gruda (a mutação some na próxima
    // leitura, que reparseia a URL) nem `req.query = ...` funciona (lança
    // "Cannot set property query ... which has only a getter"). Precisa
    // redefinir a propriedade direto na instância pra sobrepor o getter.
    Object.defineProperty(req, 'query', {
      value: result.data,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    next();
  };
};
