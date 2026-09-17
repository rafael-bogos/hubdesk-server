import { RequestHandler, Router } from 'express';
import multer from 'multer';
import { AppError } from '../../../../domain/errors/app-error';
import { UserController } from '../controllers/user-controller';
import { validate } from '../middleware/validate';
import { requireRole } from '../middleware/require-role';
import { updateNotificationPreferencesSchema } from '../schemas/user.schemas';

const ALLOWED_AVATAR_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.mimetype)) {
      callback(new AppError('Formato de imagem não suportado (use PNG, JPEG ou WebP)', 400));
      return;
    }
    callback(null, true);
  },
});

export const makeUserRouter = (userController: UserController, authenticate: RequestHandler) => {
  const router = Router();

  router.get('/users/agents', authenticate, requireRole('AGENT', 'ADMIN'), userController.listAgents);
  router.patch(
    '/users/me/notification-preferences',
    authenticate,
    validate(updateNotificationPreferencesSchema),
    userController.updateNotificationPreferences,
  );
  router.post('/users/me/avatar', authenticate, uploadAvatar.single('file'), userController.uploadAvatar);
  router.delete('/users/me/avatar', authenticate, userController.deleteAvatar);
  // Público (sem authenticate) — pra `<img src>` funcionar em qualquer lugar
  // do app sem precisar carregar Authorization header, mesmo padrão de
  // GET /auth/login-logo.
  router.get('/users/:id/avatar', userController.getAvatar);

  return router;
};
