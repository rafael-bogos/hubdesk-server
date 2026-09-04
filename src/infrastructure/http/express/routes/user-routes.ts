import { RequestHandler, Router } from 'express';
import { UserController } from '../controllers/user-controller';
import { requireRole } from '../middleware/require-role';

export const makeUserRouter = (userController: UserController, authenticate: RequestHandler) => {
  const router = Router();

  router.get('/users/agents', authenticate, requireRole('AGENT', 'ADMIN'), userController.listAgents);

  return router;
};
