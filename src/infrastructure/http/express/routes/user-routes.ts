import { RequestHandler, Router } from 'express';
import { UserController } from '../controllers/user-controller';
import { validate } from '../middleware/validate';
import { requireRole } from '../middleware/require-role';
import { updateNotificationPreferencesSchema } from '../schemas/user.schemas';

export const makeUserRouter = (userController: UserController, authenticate: RequestHandler) => {
  const router = Router();

  router.get('/users/agents', authenticate, requireRole('AGENT', 'ADMIN'), userController.listAgents);
  router.patch(
    '/users/me/notification-preferences',
    authenticate,
    validate(updateNotificationPreferencesSchema),
    userController.updateNotificationPreferences,
  );

  return router;
};
