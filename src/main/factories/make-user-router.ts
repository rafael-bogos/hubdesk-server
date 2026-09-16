import { PrismaClient } from '@prisma/client';
import { RequestHandler } from 'express';
import { ListAgentsUseCase } from '../../application/use-cases/users/list-agents.use-case';
import { UpdateNotificationPreferencesUseCase } from '../../application/use-cases/users/update-notification-preferences.use-case';
import { PrismaUserRepository } from '../../infrastructure/database/repositories/prisma-user-repository';
import { UserController } from '../../infrastructure/http/express/controllers/user-controller';
import { makeUserRouter } from '../../infrastructure/http/express/routes/user-routes';

export const makeUserModule = (prisma: PrismaClient, authenticate: RequestHandler) => {
  const userRepository = new PrismaUserRepository(prisma);
  const listAgentsUseCase = new ListAgentsUseCase(userRepository);
  const updateNotificationPreferencesUseCase = new UpdateNotificationPreferencesUseCase(userRepository);
  const userController = new UserController(listAgentsUseCase, updateNotificationPreferencesUseCase);

  return {
    router: makeUserRouter(userController, authenticate),
  };
};
