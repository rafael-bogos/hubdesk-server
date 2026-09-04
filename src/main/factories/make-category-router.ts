import { PrismaClient } from '@prisma/client';
import { RequestHandler } from 'express';
import { ListActiveCategoriesUseCase } from '../../application/use-cases/categories/list-active-categories.use-case';
import { PrismaCategoryRepository } from '../../infrastructure/database/repositories/prisma-category-repository';
import { CategoryController } from '../../infrastructure/http/express/controllers/category-controller';
import { makeCategoryRouter } from '../../infrastructure/http/express/routes/category-routes';

export const makeCategoryModule = (prisma: PrismaClient, authenticate: RequestHandler) => {
  const categoryRepository = new PrismaCategoryRepository(prisma);
  const listActiveCategoriesUseCase = new ListActiveCategoriesUseCase(categoryRepository);
  const categoryController = new CategoryController(listActiveCategoriesUseCase);

  return {
    router: makeCategoryRouter(categoryController, authenticate),
  };
};
