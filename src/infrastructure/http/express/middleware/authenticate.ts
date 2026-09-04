import { NextFunction, Request, Response } from 'express';
import { Role } from '../../../../domain/entities/user.entity';
import { UnauthorizedError } from '../../../../domain/errors/auth-errors';
import { TokenService } from '../../../../domain/ports/token-service';
import { UserRepository } from '../../../../domain/repositories/user-repository';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- required to augment Express's Request type
  namespace Express {
    interface Request {
      user?: { userId: string; role: Role; tokenVersion: number };
    }
  }
}

export const makeAuthenticate = (userRepository: UserRepository, tokenService: TokenService) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        throw new UnauthorizedError('Token de acesso não fornecido');
      }

      const token = authHeader.split(' ')[1];

      if (!token) {
        throw new UnauthorizedError('Token de acesso não fornecido');
      }

      const decoded = tokenService.verifyAccessToken(token);
      const user = await userRepository.findById(decoded.userId);

      if (!user || !user.active) {
        throw new UnauthorizedError('Usuário não encontrado');
      }

      if (user.tokenVersion !== decoded.tokenVersion) {
        throw new UnauthorizedError('Token inválido ou expirado');
      }

      req.user = { userId: user.id, role: user.role, tokenVersion: user.tokenVersion };

      next();
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        return next(err);
      }
      next(new UnauthorizedError('Token inválido ou expirado'));
    }
  };
};
