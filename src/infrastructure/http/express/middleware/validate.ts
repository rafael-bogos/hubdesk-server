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

    Object.assign(req.query, result.data);
    next();
  };
};
