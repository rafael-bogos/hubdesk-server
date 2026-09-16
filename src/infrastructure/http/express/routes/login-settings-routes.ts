import { RequestHandler, Router } from 'express';
import multer from 'multer';
import { AppError } from '../../../../domain/errors/app-error';
import { AdminLoginSettingsController } from '../controllers/admin-login-settings-controller';
import { requireRole } from '../middleware/require-role';
import { validate } from '../middleware/validate';
import { updateLoginSettingsSchema } from '../schemas/login-settings.schemas';

const ALLOWED_LOGO_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']);

const uploadLogo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_LOGO_MIME_TYPES.has(file.mimetype)) {
      callback(new AppError('Formato de imagem não suportado (use PNG, JPEG, WebP ou SVG)', 400));
      return;
    }
    callback(null, true);
  },
});

export const makeLoginSettingsRouter = (
  adminLoginSettingsController: AdminLoginSettingsController,
  authenticate: RequestHandler,
) => {
  const router = Router();

  router.use('/admin/login-settings', authenticate, requireRole('ADMIN'));

  router.get('/admin/login-settings', adminLoginSettingsController.get);
  router.patch('/admin/login-settings', validate(updateLoginSettingsSchema), adminLoginSettingsController.update);
  router.post(
    '/admin/login-settings/logo',
    uploadLogo.single('file'),
    adminLoginSettingsController.uploadLogo,
  );
  router.delete('/admin/login-settings/logo', adminLoginSettingsController.deleteLogo);

  return router;
};
