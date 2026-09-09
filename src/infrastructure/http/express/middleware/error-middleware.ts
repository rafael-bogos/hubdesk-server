import { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { AppError } from '../../../../domain/errors/app-error';
import { logger } from '../../../logging/logger';

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ error: 'Arquivo muito grande. Tamanho máximo: 50MB.' });
    return;
  }

  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof Error ? err.message : 'Erro interno do servidor';

  if (statusCode >= 500) {
    logger.error({ err }, message);
  }

  res.status(statusCode).json({ error: message });
};
