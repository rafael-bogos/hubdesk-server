import { NextFunction, Request, Response } from 'express';
import { ListNotificationsUseCase } from '../../../../application/use-cases/notifications/list-notifications.use-case';
import { MarkAllNotificationsReadUseCase } from '../../../../application/use-cases/notifications/mark-all-notifications-read.use-case';
import { MarkNotificationReadUseCase } from '../../../../application/use-cases/notifications/mark-notification-read.use-case';
import { Actor } from '../../../../application/dtos/ticket.dto';
import { UnauthorizedError } from '../../../../domain/errors/auth-errors';

export class NotificationController {
  constructor(
    private readonly listNotificationsUseCase: ListNotificationsUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
    private readonly markAllNotificationsReadUseCase: MarkAllNotificationsReadUseCase,
  ) {}

  private actor(req: Request): Actor {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    return { userId: req.user.userId, role: req.user.role };
  }

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = req.query.page ? Number(req.query.page) : undefined;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
      const result = await this.listNotificationsUseCase.execute(this.actor(req), page, pageSize);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  markRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const notification = await this.markNotificationReadUseCase.execute(id, this.actor(req));
      res.status(200).json(notification);
    } catch (err) {
      next(err);
    }
  };

  markAllRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.markAllNotificationsReadUseCase.execute(this.actor(req));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
