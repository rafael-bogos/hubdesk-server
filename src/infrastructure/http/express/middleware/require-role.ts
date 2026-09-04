import { NextFunction, Request, Response } from 'express';
import { Role } from '../../../../domain/entities/user.entity';
import { ForbiddenError, UnauthorizedError } from '../../../../domain/errors/auth-errors';

export const requireRole = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError());
    }

    next();
  };
};
