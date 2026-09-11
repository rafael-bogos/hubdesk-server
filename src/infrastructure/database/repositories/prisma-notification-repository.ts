import { Notification as PrismaNotification, PrismaClient } from '@prisma/client';
import { Notification, NotificationType } from '../../../domain/entities/notification.entity';
import {
  CreateNotificationData,
  ListNotificationsResult,
  NotificationRepository,
} from '../../../domain/repositories/notification-repository';

const toDomain = (notification: PrismaNotification): Notification => ({
  id: notification.id,
  userId: notification.userId,
  type: notification.type as NotificationType,
  title: notification.title,
  body: notification.body,
  ticketId: notification.ticketId,
  ticketNumber: notification.ticketNumber,
  read: notification.read,
  createdAt: notification.createdAt,
});

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateNotificationData): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        ticketId: data.ticketId,
        ticketNumber: data.ticketNumber,
      },
    });

    return toDomain(notification);
  }

  async listByUserId(userId: string, page: number, pageSize: number): Promise<ListNotificationsResult> {
    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return { items: items.map(toDomain), total, unreadCount, page, pageSize };
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });

    if (count === 0) return null;

    const notification = await this.prisma.notification.findUnique({ where: { id } });
    return notification ? toDomain(notification) : null;
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
