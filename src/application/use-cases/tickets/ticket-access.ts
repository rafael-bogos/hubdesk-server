import { Ticket } from '../../../domain/entities/ticket.entity';
import { TicketNotFoundError } from '../../../domain/errors/ticket-errors';
import { Actor } from '../../dtos/ticket.dto';

export const canViewTicket = (actor: Actor, ticket: Ticket): boolean =>
  actor.role !== 'CUSTOMER' || ticket.requesterId === actor.userId;

export const assertCanViewTicket = (actor: Actor, ticket: Ticket): void => {
  if (!canViewTicket(actor, ticket)) {
    throw new TicketNotFoundError();
  }
};
