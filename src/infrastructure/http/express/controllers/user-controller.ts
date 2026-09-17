import { NextFunction, Request, Response } from 'express';
import { DeleteAvatarUseCase } from '../../../../application/use-cases/users/delete-avatar.use-case';
import { GetAvatarUseCase } from '../../../../application/use-cases/users/get-avatar.use-case';
import { ListAgentsUseCase } from '../../../../application/use-cases/users/list-agents.use-case';
import { UpdateNotificationPreferencesUseCase } from '../../../../application/use-cases/users/update-notification-preferences.use-case';
import { UploadAvatarUseCase } from '../../../../application/use-cases/users/upload-avatar.use-case';
import { buildAvatarUrl } from '../../../../application/use-cases/users/avatar-url';
import { AppError } from '../../../../domain/errors/app-error';
import { UnauthorizedError } from '../../../../domain/errors/auth-errors';

export class UserController {
  constructor(
    private readonly listAgentsUseCase: ListAgentsUseCase,
    private readonly updateNotificationPreferencesUseCase: UpdateNotificationPreferencesUseCase,
    private readonly uploadAvatarUseCase: UploadAvatarUseCase,
    private readonly deleteAvatarUseCase: DeleteAvatarUseCase,
    private readonly getAvatarUseCase: GetAvatarUseCase,
  ) {}

  listAgents = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const agents = await this.listAgentsUseCase.execute();
      res.status(200).json(
        agents.map((agent) => ({
          id: agent.id,
          name: agent.name,
          email: agent.email,
          avatarUrl: buildAvatarUrl(agent),
        })),
      );
    } catch (err) {
      next(err);
    }
  };

  uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }
      if (!req.file) {
        throw new AppError('Arquivo é obrigatório', 400);
      }
      const result = await this.uploadAvatarUseCase.execute(req.user.userId, {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        buffer: req.file.buffer,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  deleteAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }
      await this.deleteAvatarUseCase.execute(req.user.userId);
      res.status(200).json({ avatarUrl: null });
    } catch (err) {
      next(err);
    }
  };

  getAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await this.getAvatarUseCase.execute(id);
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      // O helmet() aplica `Cross-Origin-Resource-Policy: same-origin` por
      // padrão em toda resposta — bloquearia o <img> do client (outra
      // origem) de carregar essa foto. Mesma exceção do GET /auth/login-logo.
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.status(200).send(result.buffer);
    } catch (err) {
      next(err);
    }
  };

  updateNotificationPreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }
      const user = await this.updateNotificationPreferencesUseCase.execute(req.user.userId, req.body);
      res.status(200).json({
        emailOnTicketUpdated: user.emailOnTicketUpdated,
        emailOnTicketClosed: user.emailOnTicketClosed,
        emailOnSlaWarning: user.emailOnSlaWarning,
      });
    } catch (err) {
      next(err);
    }
  };
}
