import { Notification, NotificationType } from '../entities/notification.entity';

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  ticketId: string;
  ticketNumber: number;
}

export interface ListNotificationsResult {
  items: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
}

export interface NotificationRepository {
  create(data: CreateNotificationData): Promise<Notification>;
  listByUserId(userId: string, page: number, pageSize: number): Promise<ListNotificationsResult>;
  // Retorna null se o id não existir ou não pertencer a esse usuário (evita
  // vazar a existência de notificação de outra pessoa).
  markAsRead(id: string, userId: string): Promise<Notification | null>;
  markAllAsRead(userId: string): Promise<void>;
}
