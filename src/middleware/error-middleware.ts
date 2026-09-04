import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const statusCode = err instanceof HttpError ? err.statusCode : 500;
  const message = err instanceof Error ? err.message : 'Erro interno do servidor';

  if (statusCode >= 500) {
    logger.error({ err }, message);
  }

  res.status(statusCode).json({ error: message });
};
