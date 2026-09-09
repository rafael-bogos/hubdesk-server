import { Ticket } from '../../../domain/entities/ticket.entity';
import { ForbiddenError } from '../../../domain/errors/auth-errors';
import { TicketNotFoundError } from '../../../domain/errors/ticket-errors';
import { TicketRepository } from '../../../domain/repositories/ticket-repository';
import { Actor, UpdateTicketStatusInput } from '../../dtos/ticket.dto';
import { assertCanViewTicket } from './ticket-access';

export class UpdateTicketStatusUseCase {
  constructor(private readonly ticketRepository: TicketRepository) {}

  async execute(ticketId: string, input: UpdateTicketStatusInput, actor: Actor): Promise<Ticket> {
    if (actor.role === 'CUSTOMER') {
      throw new ForbiddenError();
    }

    const ticket = await this.ticketRepository.findById(ticketId);

    if (!ticket) {
      throw new TicketNotFoundError();
    }

    assertCanViewTicket(actor, ticket);

    return this.ticketRepository.update(ticketId, {
      status: input.status,
      closedAt: input.status === 'CLOSED' ? new Date() : null,
    });
  }
}
