import { TicketStatus } from '../../../domain/entities/ticket.entity';
import { AppError } from '../../../domain/errors/app-error';
import { TicketClosureScheduler } from '../../../domain/ports/ticket-closure-scheduler';
import { UpdateTicketData } from '../../../domain/repositories/ticket-repository';

// Parte pura: calcula os campos que uma troca de status precisa gravar.
// Compartilhado entre a troca de status individual e a edição em lote, pra
// não duplicar a regra "PENDING_CLOSURE exige data futura / qualquer outro
// status limpa o agendamento".
export const buildStatusTransitionData = (
  status: TicketStatus,
  scheduledClosureAt: Date | null | undefined,
): UpdateTicketData => {
  if (status === 'PENDING_CLOSURE') {
    if (!scheduledClosureAt || scheduledClosureAt.getTime() <= Date.now()) {
      throw new AppError('Informe uma data e horário futuros para o fechamento automático', 400);
    }
    return { status, scheduledClosureAt, closedAt: null };
  }

  return {
    status,
    scheduledClosureAt: null,
    // RESOLVED é o status terminal agora que CLOSED não existe mais.
    closedAt: status === 'RESOLVED' ? new Date() : null,
  };
};

// Parte com efeito colateral (fila): chama DEPOIS que a escrita no banco deu
// certo, pra nunca agendar/cancelar um job pra uma mudança que não foi
// persistida.
export const syncClosureSchedule = async (
  ticketId: string,
  previousStatus: TicketStatus,
  nextStatus: TicketStatus,
  scheduledClosureAt: Date | null,
  scheduler: TicketClosureScheduler,
): Promise<void> => {
  if (nextStatus === 'PENDING_CLOSURE') {
    await scheduler.schedule(ticketId, scheduledClosureAt as Date);
  } else if (previousStatus === 'PENDING_CLOSURE') {
    await scheduler.cancel(ticketId);
  }
};
