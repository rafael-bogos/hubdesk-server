import { NotificationRepository } from '../../../domain/repositories/notification-repository';
import { Actor } from '../../dtos/ticket.dto';

export class MarkAllNotificationsReadUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(actor: Actor): Promise<void> {
    await this.notificationRepository.markAllAsRead(actor.userId);
  }
}
