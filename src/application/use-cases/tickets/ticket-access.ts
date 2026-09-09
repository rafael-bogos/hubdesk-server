import { Ticket } from '../../../domain/entities/ticket.entity';
import { TicketNotFoundError } from '../../../domain/errors/ticket-errors';
import { Actor } from '../../dtos/ticket.dto';

export const canViewTicket = (actor: Actor, ticket: Ticket): boolean => {
  if (actor.role === 'ADMIN') {
    return true;
  }

  if (actor.role === 'CUSTOMER') {
    return ticket.requesterId === actor.userId;
  }

  // AGENT: enxerga chamados ainda sem responsável (pra poder se atribuir) e
  // os que já são dele, mas não os atribuídos a outro atendente.
  return ticket.assigneeIds.length === 0 || ticket.assigneeIds.includes(actor.userId);
};

export const assertCanViewTicket = (actor: Actor, ticket: Ticket): void => {
  if (!canViewTicket(actor, ticket)) {
    throw new TicketNotFoundError();
  }
};
