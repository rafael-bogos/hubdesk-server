import { PrismaClient } from '@prisma/client';
import { RequestHandler } from 'express';
import { ListNotificationsUseCase } from '../../application/use-cases/notifications/list-notifications.use-case';
import { MarkAllNotificationsReadUseCase } from '../../application/use-cases/notifications/mark-all-notifications-read.use-case';
import { MarkNotificationReadUseCase } from '../../application/use-cases/notifications/mark-notification-read.use-case';
import { PrismaNotificationRepository } from '../../infrastructure/database/repositories/prisma-notification-repository';
import { NotificationController } from '../../infrastructure/http/express/controllers/notification-controller';
import { makeNotificationRouter } from '../../infrastructure/http/express/routes/notification-routes';

export const makeNotificationModule = (prisma: PrismaClient, authenticate: RequestHandler) => {
  const notificationRepository = new PrismaNotificationRepository(prisma);

  const listNotificationsUseCase = new ListNotificationsUseCase(notificationRepository);
  const markNotificationReadUseCase = new MarkNotificationReadUseCase(notificationRepository);
  const markAllNotificationsReadUseCase = new MarkAllNotificationsReadUseCase(notificationRepository);

  const notificationController = new NotificationController(
    listNotificationsUseCase,
    markNotificationReadUseCase,
    markAllNotificationsReadUseCase,
  );

  return {
    router: makeNotificationRouter(notificationController, authenticate),
  };
};
