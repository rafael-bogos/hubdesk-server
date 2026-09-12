import { Ticket } from '../../../domain/entities/ticket.entity';
import { ForbiddenError } from '../../../domain/errors/auth-errors';
import { TicketRepository } from '../../../domain/repositories/ticket-repository';
import { TicketNotificationService } from '../../services/ticket-notification-service';
import { Actor, UpdateTicketStatusInput } from '../../dtos/ticket.dto';
import { assertCanViewTicket, resolveTicketByNumber } from './ticket-access';

export class UpdateTicketStatusUseCase {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly ticketNotificationService: TicketNotificationService,
  ) {}

  async execute(ticketIdParam: string, input: UpdateTicketStatusInput, actor: Actor): Promise<Ticket> {
    if (actor.role === 'CUSTOMER') {
      throw new ForbiddenError();
    }

    const ticket = await resolveTicketByNumber(this.ticketRepository, ticketIdParam);

    assertCanViewTicket(actor, ticket);

    const updated = await this.ticketRepository.update(ticket.id, {
      status: input.status,
      // RESOLVED é o status terminal agora que CLOSED não existe mais.
      closedAt: input.status === 'RESOLVED' ? new Date() : null,
    });

    await this.ticketNotificationService.notifyTicketUpdated(updated, actor.userId, 'status');

    return updated;
  }
}
