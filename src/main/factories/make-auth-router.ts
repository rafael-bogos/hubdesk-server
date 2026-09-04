import { PrismaClient } from '@prisma/client';
import rateLimit from 'express-rate-limit';
import { LoginUserUseCase } from '../../application/use-cases/auth/login-user.use-case';
import { LogoutUserUseCase } from '../../application/use-cases/auth/logout-user.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/auth/refresh-token.use-case';
import { RegisterUserUseCase } from '../../application/use-cases/auth/register-user.use-case';
import { BcryptPasswordHasher } from '../../infrastructure/auth/bcrypt-password-hasher';
import { JwtTokenService } from '../../infrastructure/auth/jwt-token-service';
import { PrismaUserRepository } from '../../infrastructure/database/repositories/prisma-user-repository';
import { AuthController } from '../../infrastructure/http/express/controllers/auth-controller';
import { makeAuthenticate } from '../../infrastructure/http/express/middleware/authenticate';
import { makeAuthRouter } from '../../infrastructure/http/express/routes/auth-routes';
import { env } from '../config/env';

export const makeAuthModule = (prisma: PrismaClient) => {
  const userRepository = new PrismaUserRepository(prisma);
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService({
    secret: env.jwtSecret,
    accessExpiresIn: env.jwtAccessExpiresIn,
    refreshExpiresIn: env.jwtRefreshExpiresIn,
  });

  const registerUserUseCase = new RegisterUserUseCase(userRepository, passwordHasher, tokenService);
  const loginUserUseCase = new LoginUserUseCase(userRepository, passwordHasher, tokenService);
  const refreshTokenUseCase = new RefreshTokenUseCase(userRepository, tokenService);
  const logoutUserUseCase = new LogoutUserUseCase(userRepository);

  const authController = new AuthController(
    registerUserUseCase,
    loginUserUseCase,
    refreshTokenUseCase,
    logoutUserUseCase,
    userRepository,
  );

  const authenticate = makeAuthenticate(userRepository, tokenService);

  const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.nodeEnv === 'test',
  });

  return {
    router: makeAuthRouter(authController, authenticate, authRateLimiter),
    authenticate,
  };
};
