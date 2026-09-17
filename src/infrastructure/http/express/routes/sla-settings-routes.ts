import { RequestHandler, Router } from 'express';
import { AdminSlaSettingsController } from '../controllers/admin-sla-settings-controller';
import { requireRole } from '../middleware/require-role';
import { validate } from '../middleware/validate';
import { updateSlaSettingsSchema } from '../schemas/sla-settings.schemas';

export const makeSlaSettingsRouter = (
  adminSlaSettingsController: AdminSlaSettingsController,
  authenticate: RequestHandler,
) => {
  const router = Router();

  router.use('/admin/sla-settings', authenticate, requireRole('ADMIN'));

  router.get('/admin/sla-settings', adminSlaSettingsController.get);
  router.patch('/admin/sla-settings', validate(updateSlaSettingsSchema), adminSlaSettingsController.update);

  return router;
};
