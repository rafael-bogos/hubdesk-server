import { ListNotificationsResult, NotificationRepository } from '../../../domain/repositories/notification-repository';
import { Actor } from '../../dtos/ticket.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export class ListNotificationsUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(actor: Actor, page?: number, pageSize?: number): Promise<ListNotificationsResult> {
    const safePage = page && page > 0 ? page : DEFAULT_PAGE;
    const safePageSize = pageSize && pageSize > 0 ? Math.min(pageSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;

    return this.notificationRepository.listByUserId(actor.userId, safePage, safePageSize);
  }
}
