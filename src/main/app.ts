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
import { makeAuthModule } from './factories/make-auth-router';

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.use(healthRouter);

  const { router: authRouter } = makeAuthModule(prisma);
  app.use(authRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
