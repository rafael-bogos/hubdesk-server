import { RequestHandler, Router } from 'express';
import { AdminCategoryController } from '../controllers/admin-category-controller';
import { AdminDashboardController } from '../controllers/admin-dashboard-controller';
import { AdminUserController } from '../controllers/admin-user-controller';
import { requireRole } from '../middleware/require-role';
import { validate, validateQuery } from '../middleware/validate';
import {
  createCategorySchema,
  createUserSchema,
  listUsersQuerySchema,
  updateCategorySchema,
  updateUserSchema,
} from '../schemas/admin.schemas';

export const makeAdminRouter = (
  adminUserController: AdminUserController,
  adminCategoryController: AdminCategoryController,
  adminDashboardController: AdminDashboardController,
  authenticate: RequestHandler,
) => {
  const router = Router();

  router.use('/admin', authenticate, requireRole('ADMIN'));

  router.get('/admin/users', validateQuery(listUsersQuerySchema), adminUserController.list);
  router.post('/admin/users', validate(createUserSchema), adminUserController.create);
  router.patch('/admin/users/:id', validate(updateUserSchema), adminUserController.update);
  router.delete('/admin/users/:id', adminUserController.remove);

  router.get('/admin/categories', adminCategoryController.list);
  router.post('/admin/categories', validate(createCategorySchema), adminCategoryController.create);
  router.patch('/admin/categories/:id', validate(updateCategorySchema), adminCategoryController.update);

  router.get('/admin/dashboard', adminDashboardController.get);

  return router;
};
