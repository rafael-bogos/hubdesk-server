import { RequestHandler, Router } from 'express';
import { CategoryController } from '../controllers/category-controller';

export const makeCategoryRouter = (categoryController: CategoryController, authenticate: RequestHandler) => {
  const router = Router();

  router.get('/categories', authenticate, categoryController.list);

  return router;
};
