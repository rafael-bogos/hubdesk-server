import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { healthRouter } from '../infrastructure/http/express/routes/health-routes';
import {
  errorHandler,
  notFoundHandler,
} from '../infrastructure/http/express/middleware/error-middleware';
import { logger } from '../infrastructure/logging/logger';

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.use(healthRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
