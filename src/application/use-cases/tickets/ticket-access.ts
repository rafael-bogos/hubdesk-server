import { Ticket } from '../../../domain/entities/ticket.entity';
import { TicketNotFoundError } from '../../../domain/errors/ticket-errors';
import { TicketRepository } from '../../../domain/repositories/ticket-repository';
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

// A URL/API identifica o chamado pelo `number` (ex: "1234"), não pelo cuid
// interno (`id`) — que segue existindo só como chave primária/estrangeira no
// banco. Toda entrada externa passa por aqui antes de tocar o resto do sistema.
export const resolveTicketByNumber = async (
  ticketRepository: TicketRepository,
  rawNumber: string,
): Promise<Ticket> => {
  const number = Number(rawNumber);

  if (!Number.isInteger(number)) {
    throw new TicketNotFoundError();
  }

  const ticket = await ticketRepository.findByNumber(number);

  if (!ticket) {
    throw new TicketNotFoundError();
  }

  return ticket;
};
