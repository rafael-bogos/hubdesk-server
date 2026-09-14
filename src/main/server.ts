import { createServer } from 'node:http';
import { Queue } from 'bullmq';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from '../infrastructure/logging/logger';
import { JwtTokenService } from '../infrastructure/auth/jwt-token-service';
import { prisma } from '../infrastructure/database/prisma/client';
import { PrismaNotificationRepository } from '../infrastructure/database/repositories/prisma-notification-repository';
import { PrismaTicketRepository } from '../infrastructure/database/repositories/prisma-ticket-repository';
import { PrismaUserRepository } from '../infrastructure/database/repositories/prisma-user-repository';
import { BullmqTicketClosureScheduler } from '../infrastructure/queue/bullmq-ticket-closure-scheduler';
import { createRedisConnection } from '../infrastructure/queue/redis-connection';
import { TICKET_CLOSURE_QUEUE, TicketClosureJobData } from '../infrastructure/queue/ticket-closure-queue';
import { createTicketClosureWorker } from '../infrastructure/queue/ticket-closure-worker';
import { createSocketServer } from '../infrastructure/realtime/socket-server';
import { SocketIoRealtimeNotifier } from '../infrastructure/realtime/socket-io-realtime-notifier';
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
  httpServer.close(() => process.exit(0));
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
