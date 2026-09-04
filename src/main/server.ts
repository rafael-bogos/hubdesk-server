import { createApp } from './app';
import { env } from './config/env';
import { logger } from '../infrastructure/logging/logger';

const app = createApp();

app.listen(env.port, () => {
  logger.info(`hubdesk-server ouvindo na porta ${env.port}`);
});
