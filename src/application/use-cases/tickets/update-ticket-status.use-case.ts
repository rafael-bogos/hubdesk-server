import { Ticket } from '../../../domain/entities/ticket.entity';
import { ForbiddenError } from '../../../domain/errors/auth-errors';
import { TicketRepository } from '../../../domain/repositories/ticket-repository';
import { Actor, UpdateTicketStatusInput } from '../../dtos/ticket.dto';
import { assertCanViewTicket, resolveTicketByNumber } from './ticket-access';

export class UpdateTicketStatusUseCase {
  constructor(private readonly ticketRepository: TicketRepository) {}

  async execute(ticketIdParam: string, input: UpdateTicketStatusInput, actor: Actor): Promise<Ticket> {
    if (actor.role === 'CUSTOMER') {
      throw new ForbiddenError();
    }

    const ticket = await resolveTicketByNumber(this.ticketRepository, ticketIdParam);

    assertCanViewTicket(actor, ticket);

    return this.ticketRepository.update(ticket.id, {
      status: input.status,
      closedAt: input.status === 'CLOSED' ? new Date() : null,
    });
  }
}
