import { PrismaClient } from '@prisma/client';
import { RequestHandler } from 'express';
import { CreateCategoryUseCase } from '../../application/use-cases/admin/categories/create-category.use-case';
import { ListCategoriesUseCase } from '../../application/use-cases/admin/categories/list-categories.use-case';
import { UpdateCategoryUseCase } from '../../application/use-cases/admin/categories/update-category.use-case';
import { GetDashboardStatsUseCase } from '../../application/use-cases/admin/get-dashboard-stats.use-case';
import { CreateUserUseCase } from '../../application/use-cases/admin/users/create-user.use-case';
import { ListUsersUseCase } from '../../application/use-cases/admin/users/list-users.use-case';
import { UpdateUserUseCase } from '../../application/use-cases/admin/users/update-user.use-case';
import { BcryptPasswordHasher } from '../../infrastructure/auth/bcrypt-password-hasher';
import { PrismaAuditLogger } from '../../infrastructure/database/audit/prisma-audit-logger';
import { PrismaCategoryRepository } from '../../infrastructure/database/repositories/prisma-category-repository';
import { PrismaDashboardStatsRepository } from '../../infrastructure/database/repositories/prisma-dashboard-stats-repository';
import { PrismaUserRepository } from '../../infrastructure/database/repositories/prisma-user-repository';
import { AdminCategoryController } from '../../infrastructure/http/express/controllers/admin-category-controller';
import { AdminDashboardController } from '../../infrastructure/http/express/controllers/admin-dashboard-controller';
import { AdminUserController } from '../../infrastructure/http/express/controllers/admin-user-controller';
import { makeAdminRouter } from '../../infrastructure/http/express/routes/admin-routes';

export const makeAdminModule = (prisma: PrismaClient, authenticate: RequestHandler) => {
  const userRepository = new PrismaUserRepository(prisma);
  const categoryRepository = new PrismaCategoryRepository(prisma);
  const dashboardStatsRepository = new PrismaDashboardStatsRepository(prisma);
  const passwordHasher = new BcryptPasswordHasher();
  const auditLogger = new PrismaAuditLogger(prisma);

  const listUsersUseCase = new ListUsersUseCase(userRepository);
  const createUserUseCase = new CreateUserUseCase(userRepository, passwordHasher, auditLogger);
  const updateUserUseCase = new UpdateUserUseCase(userRepository, auditLogger);

  const listCategoriesUseCase = new ListCategoriesUseCase(categoryRepository);
  const createCategoryUseCase = new CreateCategoryUseCase(categoryRepository, auditLogger);
  const updateCategoryUseCase = new UpdateCategoryUseCase(categoryRepository, auditLogger);

  const getDashboardStatsUseCase = new GetDashboardStatsUseCase(dashboardStatsRepository);

  const adminUserController = new AdminUserController(listUsersUseCase, createUserUseCase, updateUserUseCase);
  const adminCategoryController = new AdminCategoryController(
    listCategoriesUseCase,
    createCategoryUseCase,
    updateCategoryUseCase,
  );
  const adminDashboardController = new AdminDashboardController(getDashboardStatsUseCase);

  return {
    router: makeAdminRouter(adminUserController, adminCategoryController, adminDashboardController, authenticate),
  };
};
