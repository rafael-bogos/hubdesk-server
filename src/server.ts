import { createApp } from './app';
import { logger } from './utils/logger';

const port = Number(process.env.PORT ?? 3001);

const app = createApp();

app.listen(port, () => {
  logger.info(`chamados-server ouvindo na porta ${port}`);
});
