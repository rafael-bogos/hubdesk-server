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
import { SocketIoTicketNotifier } from '../infrastructure/realtime/socket-io-ticket-notifier';
import { AppSocketServer } from '../infrastructure/realtime/socket-server';
import { makeAdminModule } from './factories/make-admin-router';
import { makeAuthModule } from './factories/make-auth-router';
import { makeCategoryModule } from './factories/make-category-router';
import { makeTicketModule } from './factories/make-ticket-router';
import { makeUserModule } from './factories/make-user-router';

export const createApp = (options: { io?: AppSocketServer } = {}) => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.use(healthRouter);

  const { router: authRouter, authenticate } = makeAuthModule(prisma);
  app.use(authRouter);

  const ticketNotifier = options.io ? new SocketIoTicketNotifier(options.io) : undefined;
  const { router: ticketRouter } = makeTicketModule(prisma, authenticate, ticketNotifier);
  app.use(ticketRouter);

  const { router: userRouter } = makeUserModule(prisma, authenticate);
  app.use(userRouter);

  const { router: categoryRouter } = makeCategoryModule(prisma, authenticate);
  app.use(categoryRouter);

  const { router: adminRouter } = makeAdminModule(prisma, authenticate);
  app.use(adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
