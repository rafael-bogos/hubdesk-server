import { TicketCreatedEvent, TicketNotifier } from '../../domain/ports/ticket-notifier';
import { AGENTS_ROOM, AppSocketServer } from './socket-server';

export class SocketIoTicketNotifier implements TicketNotifier {
  constructor(private readonly io: AppSocketServer) {}

  notifyTicketCreated(event: TicketCreatedEvent): void {
    this.io.to(AGENTS_ROOM).emit('ticket:created', event);
  }
}
