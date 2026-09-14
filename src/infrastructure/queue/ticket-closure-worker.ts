import IORedis from 'ioredis';
import { Worker } from 'bullmq';
import { TicketRepository } from '../../domain/repositories/ticket-repository';
import { TicketNotificationService } from '../../application/services/ticket-notification-service';
import { logger } from '../logging/logger';
import { processTicketClosureJob } from './process-ticket-closure-job';
import { TICKET_CLOSURE_QUEUE, TicketClosureJobData } from './ticket-closure-queue';

export const createTicketClosureWorker = (
  connection: IORedis,
  ticketRepository: TicketRepository,
  ticketNotificationService: TicketNotificationService,
): Worker<TicketClosureJobData> => {
  const worker = new Worker<TicketClosureJobData>(
    TICKET_CLOSURE_QUEUE,
    async (job) => {
      await processTicketClosureJob(job.data.ticketId, ticketRepository, ticketNotificationService);
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    logger.error({ ticketId: job?.data.ticketId, err }, 'falha ao processar job de fechamento automático');
  });

  return worker;
};
