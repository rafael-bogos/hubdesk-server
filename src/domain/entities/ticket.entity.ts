export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'PENDING_CLOSURE' | 'RESOLVED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Ticket {
  id: string;
  number: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  requesterId: string;
  assigneeIds: string[];
  categoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  // Só não-null enquanto status === 'PENDING_CLOSURE' — ver TicketClosureScheduler.
  scheduledClosureAt: Date | null;
  // SLA (ver application/services/sla-calculator.ts) — o prazo em si não é
  // guardado aqui, é sempre recalculado a partir de createdAt/priority/settings.
  // Setado ao entrar em WAITING, null fora disso (ainda pausado agora).
  slaPausedAt: Date | null;
  // Soma de pausas já concluídas (ms) — não inclui a pausa em andamento.
  slaPausedDurationMs: number;
  // Evita reenviar o aviso de "perto de estourar" a cada varredura do job.
  slaWarningNotifiedAt: Date | null;
}
