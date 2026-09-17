import { Ticket, TicketPriority } from '../../domain/entities/ticket.entity';
import { SlaSettings } from '../../domain/entities/sla-settings.entity';

export type SlaState = 'ok' | 'near_breach' | 'breached';

export interface SlaCalculation {
  totalMs: number;
  elapsedMs: number;
  remainingMs: number;
  // 0-100+ — pode passar de 100 depois de estourado.
  percentConsumed: number;
  dueAt: Date;
  state: SlaState;
}

type SlaTicketInput = Pick<
  Ticket,
  'createdAt' | 'priority' | 'status' | 'closedAt' | 'slaPausedAt' | 'slaPausedDurationMs'
>;

const HOURS_BY_PRIORITY = (settings: SlaSettings): Record<TicketPriority, number> => ({
  LOW: settings.lowPriorityHours,
  MEDIUM: settings.mediumPriorityHours,
  HIGH: settings.highPriorityHours,
  URGENT: settings.urgentPriorityHours,
});

// Única fonte de verdade do cálculo de SLA — usada tanto pra exibir no GET
// de chamados quanto pelo job de varredura que decide notificar. O prazo
// nunca é persistido: é sempre recalculado a partir de createdAt/priority e
// da configuração atual, então uma mudança de prioridade ou de configuração
// se reflete imediatamente, sem precisar recalcular chamados antigos.
export const calculateSla = (ticket: SlaTicketInput, settings: SlaSettings, now: Date = new Date()): SlaCalculation => {
  const totalMs = HOURS_BY_PRIORITY(settings)[ticket.priority] * 3_600_000;

  // Congela o relógio no fechamento — um chamado resolvido não continua
  // "estourando" pra sempre só porque ninguém mais olha pra ele.
  const endMoment = ticket.status === 'RESOLVED' && ticket.closedAt ? ticket.closedAt : now;

  // Enquanto pausado (WAITING), a pausa em andamento cresce no mesmo ritmo
  // que `endMoment` avança, então `elapsedMs` abaixo fica parado — é assim
  // que o relógio "pausa" sem precisar de um job rodando o tempo todo.
  const ongoingPauseMs = ticket.slaPausedAt ? Math.max(0, endMoment.getTime() - ticket.slaPausedAt.getTime()) : 0;
  const pausedMs = ticket.slaPausedDurationMs + ongoingPauseMs;

  const elapsedMs = Math.max(0, endMoment.getTime() - ticket.createdAt.getTime() - pausedMs);
  const remainingMs = totalMs - elapsedMs;
  const percentConsumed = totalMs > 0 ? (elapsedMs / totalMs) * 100 : 100;
  const dueAt = new Date(now.getTime() + remainingMs);

  const state: SlaState =
    percentConsumed >= 100 ? 'breached' : percentConsumed >= settings.warningThresholdPercent ? 'near_breach' : 'ok';

  return { totalMs, elapsedMs, remainingMs, percentConsumed, dueAt, state };
};
