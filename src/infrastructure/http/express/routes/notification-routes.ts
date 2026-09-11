import { RequestHandler, Router } from 'express';
import { NotificationController } from '../controllers/notification-controller';

export const makeNotificationRouter = (
  notificationController: NotificationController,
  authenticate: RequestHandler,
) => {
  const router = Router();

  router.use('/notifications', authenticate);

  router.get('/notifications', notificationController.list);
  router.patch('/notifications/read-all', notificationController.markAllRead);
  router.patch('/notifications/:id/read', notificationController.markRead);

  return router;
};
