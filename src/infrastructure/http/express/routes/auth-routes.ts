import { RequestHandler, Router } from 'express';
import { AuthController } from '../controllers/auth-controller';
import { validate } from '../middleware/validate';
import { changePasswordSchema, loginSchema, refreshSchema, registerSchema } from '../schemas/auth.schemas';

export const makeAuthRouter = (
  authController: AuthController,
  authenticate: RequestHandler,
  authRateLimiter: RequestHandler,
) => {
  const router = Router();

  router.post('/auth/register', authRateLimiter, validate(registerSchema), authController.register);
  router.post('/auth/login', authRateLimiter, validate(loginSchema), authController.login);
  router.post('/auth/refresh', validate(refreshSchema), authController.refresh);
  router.post('/auth/logout', authenticate, authController.logout);
  router.post(
    '/auth/change-password',
    authenticate,
    validate(changePasswordSchema),
    authController.changePassword,
  );
  router.get('/auth/me', authenticate, authController.me);

  return router;
};
