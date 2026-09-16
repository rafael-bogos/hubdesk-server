import { NextFunction, Request, Response } from 'express';
import { ChangePasswordUseCase } from '../../../../application/use-cases/auth/change-password.use-case';
import { LoginUserUseCase } from '../../../../application/use-cases/auth/login-user.use-case';
import { LogoutUserUseCase } from '../../../../application/use-cases/auth/logout-user.use-case';
import { RefreshTokenUseCase } from '../../../../application/use-cases/auth/refresh-token.use-case';
import { RegisterUserUseCase } from '../../../../application/use-cases/auth/register-user.use-case';
import { UnauthorizedError } from '../../../../domain/errors/auth-errors';
import { UserRepository } from '../../../../domain/repositories/user-repository';

export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUserUseCase: LogoutUserUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly userRepository: UserRepository,
  ) {}

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.registerUserUseCase.execute(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.loginUserUseCase.execute(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.refreshTokenUseCase.execute(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }
      await this.logoutUserUseCase.execute({ userId: req.user.userId });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }
      const result = await this.changePasswordUseCase.execute(req.user.userId, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }
      const user = await this.userRepository.findById(req.user.userId);
      if (!user) {
        throw new UnauthorizedError();
      }
      res.status(200).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailOnTicketUpdated: user.emailOnTicketUpdated,
        emailOnTicketClosed: user.emailOnTicketClosed,
      });
    } catch (err) {
      next(err);
    }
  };
}
