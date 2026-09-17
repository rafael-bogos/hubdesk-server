import { calculateSla } from '../../application/services/sla-calculator';
import { TicketNotificationService } from '../../application/services/ticket-notification-service';
import { SlaSettingsRepository } from '../../domain/repositories/sla-settings-repository';
import { TicketRepository } from '../../domain/repositories/ticket-repository';
import { logger } from '../logging/logger';

// Lógica pura do job, separada do `Worker` do BullMQ pra poder ser testada
// sem precisar de um Redis de verdade (ver tests/process-sla-scan-job.test.ts).
export const processSlaScanJob = async (
  ticketRepository: TicketRepository,
  slaSettingsRepository: SlaSettingsRepository,
  ticketNotificationService: TicketNotificationService,
): Promise<void> => {
  const [tickets, settings] = await Promise.all([
    ticketRepository.findAllUnresolved(),
    slaSettingsRepository.get(),
  ]);

  for (const ticket of tickets) {
    // Dedupe: já avisado (ou o próprio job já rodou pra esse estado) — só
    // reseta quando a prioridade muda (ver bulk-update-tickets.use-case.ts).
    if (ticket.slaWarningNotifiedAt) continue;

    const sla = calculateSla(ticket, settings);
    // `!== 'ok'` cobre near_breach e breached — se por algum motivo a
    // varredura só percebeu o chamado depois de já estourado (ex: intervalo
    // de varredura grande, ou o limiar foi reduzido depois), ainda avisa uma
    // vez em vez de nunca avisar.
    if (sla.state === 'ok') continue;

    await ticketNotificationService.notifySlaWarning(ticket, sla.dueAt);
    await ticketRepository.update(ticket.id, { slaWarningNotifiedAt: new Date() });

    logger.info({ ticketId: ticket.id, state: sla.state }, 'aviso de SLA disparado');
  }
};
