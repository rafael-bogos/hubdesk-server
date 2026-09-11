import { Notification } from '../../../domain/entities/notification.entity';
import { NotificationNotFoundError } from '../../../domain/errors/notification-errors';
import { NotificationRepository } from '../../../domain/repositories/notification-repository';
import { Actor } from '../../dtos/ticket.dto';

export class MarkNotificationReadUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(notificationId: string, actor: Actor): Promise<Notification> {
    const notification = await this.notificationRepository.markAsRead(notificationId, actor.userId);

    if (!notification) {
      throw new NotificationNotFoundError();
    }

    return notification;
  }
}
