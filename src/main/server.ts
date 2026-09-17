import { createServer } from 'node:http';
import { Queue } from 'bullmq';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from '../infrastructure/logging/logger';
import { JwtTokenService } from '../infrastructure/auth/jwt-token-service';
import { prisma } from '../infrastructure/database/prisma/client';
import { PrismaAgentCategoryRepository } from '../infrastructure/database/repositories/prisma-agent-category-repository';
import { PrismaNotificationRepository } from '../infrastructure/database/repositories/prisma-notification-repository';
import { PrismaSlaSettingsRepository } from '../infrastructure/database/repositories/prisma-sla-settings-repository';
import { PrismaTicketRepository } from '../infrastructure/database/repositories/prisma-ticket-repository';
import { PrismaUserRepository } from '../infrastructure/database/repositories/prisma-user-repository';
import { BullmqTicketClosureScheduler } from '../infrastructure/queue/bullmq-ticket-closure-scheduler';
import { createRedisConnection } from '../infrastructure/queue/redis-connection';
import { SLA_SCAN_INTERVAL_MS, SLA_SCAN_JOB_ID, SLA_SCAN_QUEUE } from '../infrastructure/queue/sla-scan-queue';
import { createSlaScanWorker } from '../infrastructure/queue/sla-scan-worker';
import { TICKET_CLOSURE_QUEUE, TicketClosureJobData } from '../infrastructure/queue/ticket-closure-queue';
import { createTicketClosureWorker } from '../infrastructure/queue/ticket-closure-worker';
import { createSocketServer } from '../infrastructure/realtime/socket-server';
import { SocketIoRealtimeNotifier } from '../infrastructure/realtime/socket-io-realtime-notifier';
import { makeEmailSender } from '../infrastructure/email/make-email-sender';
import { TicketNotificationService } from '../application/services/ticket-notification-service';

// `io` é criado sem servidor HTTP ainda (só pra já existir e poder ser
// injetado no app/use cases), o Express é anexado ao http.Server primeiro, e
// só then `io.attach(httpServer)` — nessa ordem o socket.io consegue capturar
// o Express como listener pré-existente e multiplexar os dois na mesma porta
// sem conflito (na ordem invertida, os dois brigam pelo mesmo request/response).
const io = createSocketServer({
  userRepository: new PrismaUserRepository(prisma),
  tokenService: new JwtTokenService({
    secret: env.jwtSecret,
    accessExpiresIn: env.jwtAccessExpiresIn,
    refreshExpiresIn: env.jwtRefreshExpiresIn,
  }),
});

// Fila do BullMQ: `closureQueue` é o lado que agenda (usado pelos use cases,
// via BullmqTicketClosureScheduler), o Worker abaixo é o lado que processa —
// nesse "simples" os dois rodam no mesmo processo do servidor HTTP, cada um
// com sua própria conexão Redis (o Worker usa comandos bloqueantes por baixo
// dos panos, por isso não compartilha a conexão da fila).
const closureQueue = new Queue<TicketClosureJobData>(TICKET_CLOSURE_QUEUE, {
  connection: createRedisConnection(),
});
const ticketClosureScheduler = new BullmqTicketClosureScheduler(closureQueue);

const ticketClosureWorker = createTicketClosureWorker(
  createRedisConnection(),
  new PrismaTicketRepository(prisma),
  new TicketNotificationService(
    new PrismaUserRepository(prisma),
    new PrismaNotificationRepository(prisma),
    new SocketIoRealtimeNotifier(io),
    makeEmailSender(),
    new PrismaAgentCategoryRepository(prisma),
  ),
);

// Varredura periódica de SLA: job repetível (nunca existiu um antes desta
// feature — o de fechamento automático é single-shot com delay). BullMQ v6
// usa "job schedulers" pra isso; `upsertJobScheduler` com o mesmo id é
// idempotente entre reinícios do processo, então não duplica a varredura a
// cada `npm run dev`/deploy.
const slaScanQueue = new Queue(SLA_SCAN_QUEUE, { connection: createRedisConnection() });
slaScanQueue
  .upsertJobScheduler(SLA_SCAN_JOB_ID, { every: SLA_SCAN_INTERVAL_MS })
  .catch((err) => logger.error({ err }, 'falha ao agendar a varredura periódica de SLA'));

const slaScanWorker = createSlaScanWorker(
  createRedisConnection(),
  new PrismaTicketRepository(prisma),
  new PrismaSlaSettingsRepository(prisma),
  new TicketNotificationService(
    new PrismaUserRepository(prisma),
    new PrismaNotificationRepository(prisma),
    new SocketIoRealtimeNotifier(io),
    makeEmailSender(),
    new PrismaAgentCategoryRepository(prisma),
  ),
);

const app = createApp({ io, ticketClosureScheduler });
const httpServer = createServer(app);
io.attach(httpServer);

httpServer.listen(env.port, () => {
  logger.info(`hubdesk-server ouvindo na porta ${env.port}`);
});

const shutdown = async () => {
  logger.info('encerrando hubdesk-server...');
  await ticketClosureWorker.close();
  await closureQueue.close();
  await slaScanWorker.close();
  await slaScanQueue.close();
  httpServer.close(() => process.exit(0));
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
