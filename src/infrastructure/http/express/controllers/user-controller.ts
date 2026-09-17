import { NextFunction, Request, Response } from 'express';
import { ListAgentsUseCase } from '../../../../application/use-cases/users/list-agents.use-case';
import { UpdateNotificationPreferencesUseCase } from '../../../../application/use-cases/users/update-notification-preferences.use-case';
import { UnauthorizedError } from '../../../../domain/errors/auth-errors';

export class UserController {
  constructor(
    private readonly listAgentsUseCase: ListAgentsUseCase,
    private readonly updateNotificationPreferencesUseCase: UpdateNotificationPreferencesUseCase,
  ) {}

  listAgents = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const agents = await this.listAgentsUseCase.execute();
      res.status(200).json(
        agents.map((agent) => ({
          id: agent.id,
          name: agent.name,
          email: agent.email,
        })),
      );
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
