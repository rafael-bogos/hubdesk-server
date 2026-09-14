import { TicketRepository } from '../../domain/repositories/ticket-repository';
import { TicketNotificationService } from '../../application/services/ticket-notification-service';
import { logger } from '../logging/logger';

const SYSTEM_ACTOR_ID = 'system';

// Lógica pura do job, separada do `Worker` do BullMQ pra poder ser testada
// sem precisar de um Redis de verdade (ver tests/ticket-closure.test.ts).
export const processTicketClosureJob = async (
  ticketId: string,
  ticketRepository: TicketRepository,
  ticketNotificationService: TicketNotificationService,
): Promise<void> => {
  const ticket = await ticketRepository.findById(ticketId);

  // O chamado pode ter sido reaberto, resolvido manualmente, ou até
  // reagendado com outra data entre o agendamento e a execução do job —
  // só fecha se ele ainda estiver esperando o fechamento automático.
  if (!ticket || ticket.status !== 'PENDING_CLOSURE') {
    logger.info({ ticketId }, 'job de fechamento automático ignorado: chamado não está mais em PENDING_CLOSURE');
    return;
  }

  const updated = await ticketRepository.update(ticket.id, {
    status: 'RESOLVED',
    closedAt: new Date(),
    scheduledClosureAt: null,
  });

  await ticketNotificationService.notifyTicketUpdated(updated, SYSTEM_ACTOR_ID, ['status']);

  logger.info({ ticketId }, 'chamado fechado automaticamente pelo prazo de PENDING_CLOSURE');
};
