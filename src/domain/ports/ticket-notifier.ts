import { TicketPriority } from '../entities/ticket.entity';

export interface TicketCreatedEvent {
  id: string;
  number: number;
  title: string;
  priority: TicketPriority;
  requesterId: string;
}

export interface TicketNotifier {
  // Best-effort: emitir uma notificação em tempo real nunca deve derrubar a
  // criação do chamado, por isso não é async/awaited pelo use case.
  notifyTicketCreated(event: TicketCreatedEvent): void;
}
