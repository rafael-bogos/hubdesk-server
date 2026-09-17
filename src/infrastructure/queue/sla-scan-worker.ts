import IORedis from 'ioredis';
import { Worker } from 'bullmq';
import { TicketNotificationService } from '../../application/services/ticket-notification-service';
import { SlaSettingsRepository } from '../../domain/repositories/sla-settings-repository';
import { TicketRepository } from '../../domain/repositories/ticket-repository';
import { logger } from '../logging/logger';
import { processSlaScanJob } from './process-sla-scan-job';
import { SLA_SCAN_QUEUE } from './sla-scan-queue';

export const createSlaScanWorker = (
  connection: IORedis,
  ticketRepository: TicketRepository,
  slaSettingsRepository: SlaSettingsRepository,
  ticketNotificationService: TicketNotificationService,
): Worker => {
  const worker = new Worker(
    SLA_SCAN_QUEUE,
    async () => {
      await processSlaScanJob(ticketRepository, slaSettingsRepository, ticketNotificationService);
    },
    { connection },
  );

  worker.on('failed', (_job, err) => {
    logger.error({ err }, 'falha ao processar varredura de SLA');
  });

  return worker;
};
