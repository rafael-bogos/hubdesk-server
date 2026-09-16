import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { prisma } from '../infrastructure/database/prisma/client';
import { healthRouter } from '../infrastructure/http/express/routes/health-routes';
import {
  errorHandler,
  notFoundHandler,
} from '../infrastructure/http/express/middleware/error-middleware';
import { logger } from '../infrastructure/logging/logger';
import { TicketClosureScheduler } from '../domain/ports/ticket-closure-scheduler';
import {
  BETTER_AUTH_BASE_PATH,
  BetterAuthProvider,
  toNodeHandler,
} from '../infrastructure/auth/better-auth-instance';
import { PrismaLoginSettingsRepository } from '../infrastructure/database/repositories/prisma-login-settings-repository';
import { SocketIoRealtimeNotifier } from '../infrastructure/realtime/socket-io-realtime-notifier';
import { AppSocketServer } from '../infrastructure/realtime/socket-server';
import { makeAdminModule } from './factories/make-admin-router';
import { makeAuthModule } from './factories/make-auth-router';
import { makeCategoryModule } from './factories/make-category-router';
import { makeLoginSettingsModule } from './factories/make-login-settings-router';
import { makeNotificationModule } from './factories/make-notification-router';
import { makeTicketModule } from './factories/make-ticket-router';
import { makeUserModule } from './factories/make-user-router';

export const createApp = (
  options: { io?: AppSocketServer; ticketClosureScheduler?: TicketClosureScheduler } = {},
) => {
  const app = express();

  const loginSettingsRepository = new PrismaLoginSettingsRepository(prisma);
  const betterAuthProvider = new BetterAuthProvider(prisma, loginSettingsRepository);

  // Precisa rodar antes do body-parser (`express.json()`) — o better-auth lê
  // o corpo da request sozinho, e um parser rodando antes consome o stream e
  // deixa o handler dele pendurado.
  app.all(`${BETTER_AUTH_BASE_PATH}/*splat`, async (req, res, next) => {
    try {
      const auth = await betterAuthProvider.getInstance();
      await toNodeHandler(auth)(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.use(healthRouter);

  const { router: authRouter, authenticate } = makeAuthModule(prisma, betterAuthProvider);
  app.use(authRouter);

  const realtimeNotifier = options.io ? new SocketIoRealtimeNotifier(options.io) : undefined;
  const { router: ticketRouter } = makeTicketModule(
    prisma,
    authenticate,
    realtimeNotifier,
    options.ticketClosureScheduler,
  );
  app.use(ticketRouter);

  const { router: notificationRouter } = makeNotificationModule(prisma, authenticate);
  app.use(notificationRouter);

  const { router: userRouter } = makeUserModule(prisma, authenticate);
  app.use(userRouter);

  const { router: categoryRouter } = makeCategoryModule(prisma, authenticate);
  app.use(categoryRouter);

  const { router: adminRouter } = makeAdminModule(prisma, authenticate);
  app.use(adminRouter);

  const { router: loginSettingsRouter } = makeLoginSettingsModule(
    authenticate,
    loginSettingsRepository,
    betterAuthProvider,
  );
  app.use(loginSettingsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
