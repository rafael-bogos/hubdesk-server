import { RequestHandler, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth-controller';
import { validate } from '../middleware/validate';
import { loginSchema, refreshSchema, registerSchema } from '../schemas/auth.schemas';

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

export const makeAuthRouter = (authController: AuthController, authenticate: RequestHandler) => {
  const router = Router();

  router.post('/auth/register', authRateLimiter, validate(registerSchema), authController.register);
  router.post('/auth/login', authRateLimiter, validate(loginSchema), authController.login);
  router.post('/auth/refresh', validate(refreshSchema), authController.refresh);
  router.post('/auth/logout', authenticate, authController.logout);
  router.get('/auth/me', authenticate, authController.me);

  return router;
};
