import { Ticket } from '../../../domain/entities/ticket.entity';
import { ForbiddenError } from '../../../domain/errors/auth-errors';
import { TicketNotFoundError } from '../../../domain/errors/ticket-errors';
import { TicketRepository } from '../../../domain/repositories/ticket-repository';
import { Actor, AssignTicketInput } from '../../dtos/ticket.dto';

export class AssignTicketUseCase {
  constructor(private readonly ticketRepository: TicketRepository) {}

  async execute(ticketId: string, input: AssignTicketInput, actor: Actor): Promise<Ticket> {
    if (actor.role === 'CUSTOMER') {
      throw new ForbiddenError();
    }

    const ticket = await this.ticketRepository.findById(ticketId);

    if (!ticket) {
      throw new TicketNotFoundError();
    }

    return this.ticketRepository.setAssignees(ticketId, input.assigneeIds);
  }
}
