import { PrismaClient } from '@prisma/client';
import rateLimit from 'express-rate-limit';
import { Router } from 'express';
import { ChangePasswordUseCase } from '../../application/use-cases/auth/change-password.use-case';
import { CompleteOAuthUseCase } from '../../application/use-cases/auth/complete-oauth.use-case';
import { ExchangeOAuthCodeUseCase } from '../../application/use-cases/auth/exchange-oauth-code.use-case';
import { GetLoginLogoUseCase } from '../../application/use-cases/auth/get-login-logo.use-case';
import { GetLoginMethodsUseCase } from '../../application/use-cases/auth/get-login-methods.use-case';
import { LoginUserUseCase } from '../../application/use-cases/auth/login-user.use-case';
import { LogoutUserUseCase } from '../../application/use-cases/auth/logout-user.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/auth/refresh-token.use-case';
import { RegisterUserUseCase } from '../../application/use-cases/auth/register-user.use-case';
import { StartOAuthUseCase } from '../../application/use-cases/auth/start-oauth.use-case';
import { BcryptPasswordHasher } from '../../infrastructure/auth/bcrypt-password-hasher';
import { BetterAuthProvider } from '../../infrastructure/auth/better-auth-instance';
import { JwtTokenService } from '../../infrastructure/auth/jwt-token-service';
import { PrismaLoginSettingsRepository } from '../../infrastructure/database/repositories/prisma-login-settings-repository';
import { PrismaUserRepository } from '../../infrastructure/database/repositories/prisma-user-repository';
import { AuthController } from '../../infrastructure/http/express/controllers/auth-controller';
import { OAuthController } from '../../infrastructure/http/express/controllers/oauth-controller';
import { makeAuthenticate } from '../../infrastructure/http/express/middleware/authenticate';
import { makeAuthRouter } from '../../infrastructure/http/express/routes/auth-routes';
import { makeOAuthRouter } from '../../infrastructure/http/express/routes/oauth-routes';
import { createRedisConnection } from '../../infrastructure/queue/redis-connection';
import { LocalFileStorage } from '../../infrastructure/storage/local-file-storage';
import { env } from '../config/env';
import { resolve } from 'node:path';

export const makeAuthModule = (prisma: PrismaClient, betterAuthProvider: BetterAuthProvider) => {
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
  const changePasswordUseCase = new ChangePasswordUseCase(userRepository, passwordHasher, tokenService);

  const authController = new AuthController(
    registerUserUseCase,
    loginUserUseCase,
    refreshTokenUseCase,
    logoutUserUseCase,
    changePasswordUseCase,
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

  // Login via Google / OAuth customizado (better-auth) — o navegador nunca
  // chama o better-auth via fetch/XHR, só navegação de página inteira, então
  // essas rotas são a ponte que devolve pro Next.js o mesmo formato de
  // {accessToken, refreshToken, user} que /auth/login já devolve.
  const loginSettingsRepository = new PrismaLoginSettingsRepository(prisma);
  const fileStorage = new LocalFileStorage(resolve(process.cwd(), env.uploadsDir));
  const oauthRedis = createRedisConnection();
  const getLoginMethodsUseCase = new GetLoginMethodsUseCase(loginSettingsRepository);
  const startOAuthUseCase = new StartOAuthUseCase(betterAuthProvider);
  const completeOAuthUseCase = new CompleteOAuthUseCase(betterAuthProvider, oauthRedis);
  const exchangeOAuthCodeUseCase = new ExchangeOAuthCodeUseCase(oauthRedis, userRepository, tokenService);
  const getLoginLogoUseCase = new GetLoginLogoUseCase(loginSettingsRepository, fileStorage);
  const oauthController = new OAuthController(
    getLoginMethodsUseCase,
    startOAuthUseCase,
    completeOAuthUseCase,
    exchangeOAuthCodeUseCase,
    getLoginLogoUseCase,
  );

  const router = Router();
  router.use(makeAuthRouter(authController, authenticate, authRateLimiter));
  router.use(makeOAuthRouter(oauthController));

  return {
    router,
    authenticate,
  };
};
