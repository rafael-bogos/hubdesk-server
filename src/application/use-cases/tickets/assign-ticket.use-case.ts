import { Ticket } from '../../../domain/entities/ticket.entity';
import { ForbiddenError } from '../../../domain/errors/auth-errors';
import { TicketRepository } from '../../../domain/repositories/ticket-repository';
import { TicketNotificationService } from '../../services/ticket-notification-service';
import { Actor, AssignTicketInput } from '../../dtos/ticket.dto';
import { assertCanViewTicket, resolveTicketByNumber } from './ticket-access';

export class AssignTicketUseCase {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly ticketNotificationService: TicketNotificationService,
  ) {}

  async execute(ticketIdParam: string, input: AssignTicketInput, actor: Actor): Promise<Ticket> {
    if (actor.role === 'CUSTOMER') {
      throw new ForbiddenError();
    }

    const ticket = await resolveTicketByNumber(this.ticketRepository, ticketIdParam);

    assertCanViewTicket(actor, ticket);

    const updated = await this.ticketRepository.setAssignees(ticket.id, input.assigneeIds);

    await this.ticketNotificationService.notifyTicketUpdated(updated, actor.userId, 'assignment');

    return updated;
  }
}
