import { TicketNotifier } from '../../domain/ports/ticket-notifier';

// Usado quando não há servidor Socket.io rodando (ex: testes) — a criação de
// chamado não deve depender de notificação em tempo real pra funcionar.
export class NullTicketNotifier implements TicketNotifier {
  notifyTicketCreated(): void {
    // no-op
  }
}
