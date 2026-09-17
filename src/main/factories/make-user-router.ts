import { PrismaClient } from '@prisma/client';
import { RequestHandler } from 'express';
import { DeleteAvatarUseCase } from '../../application/use-cases/users/delete-avatar.use-case';
import { GetAvatarUseCase } from '../../application/use-cases/users/get-avatar.use-case';
import { ListAgentsUseCase } from '../../application/use-cases/users/list-agents.use-case';
import { UpdateNotificationPreferencesUseCase } from '../../application/use-cases/users/update-notification-preferences.use-case';
import { UploadAvatarUseCase } from '../../application/use-cases/users/upload-avatar.use-case';
import { PrismaUserRepository } from '../../infrastructure/database/repositories/prisma-user-repository';
import { UserController } from '../../infrastructure/http/express/controllers/user-controller';
import { makeUserRouter } from '../../infrastructure/http/express/routes/user-routes';
import { makeFileStorage } from '../../infrastructure/storage/make-file-storage';

export const makeUserModule = (prisma: PrismaClient, authenticate: RequestHandler) => {
  const userRepository = new PrismaUserRepository(prisma);
  const fileStorage = makeFileStorage();
  const listAgentsUseCase = new ListAgentsUseCase(userRepository);
  const updateNotificationPreferencesUseCase = new UpdateNotificationPreferencesUseCase(userRepository);
  const uploadAvatarUseCase = new UploadAvatarUseCase(userRepository, fileStorage);
  const deleteAvatarUseCase = new DeleteAvatarUseCase(userRepository, fileStorage);
  const getAvatarUseCase = new GetAvatarUseCase(userRepository, fileStorage);
  const userController = new UserController(
    listAgentsUseCase,
    updateNotificationPreferencesUseCase,
    uploadAvatarUseCase,
    deleteAvatarUseCase,
    getAvatarUseCase,
  );

  return {
    router: makeUserRouter(userController, authenticate),
  };
};
