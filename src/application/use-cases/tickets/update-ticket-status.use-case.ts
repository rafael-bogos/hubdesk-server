import { Ticket } from '../../../domain/entities/ticket.entity';
import { ForbiddenError } from '../../../domain/errors/auth-errors';
import { TicketClosureScheduler } from '../../../domain/ports/ticket-closure-scheduler';
import { TicketRepository } from '../../../domain/repositories/ticket-repository';
import { TicketNotificationService } from '../../services/ticket-notification-service';
import { Actor, UpdateTicketStatusInput } from '../../dtos/ticket.dto';
import { buildSlaPauseData, buildStatusTransitionData, syncClosureSchedule } from './apply-status-transition';
import { assertCanViewTicket, resolveTicketByNumber } from './ticket-access';

export class UpdateTicketStatusUseCase {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly ticketNotificationService: TicketNotificationService,
    private readonly ticketClosureScheduler: TicketClosureScheduler,
  ) {}

  async execute(ticketIdParam: string, input: UpdateTicketStatusInput, actor: Actor): Promise<Ticket> {
    if (actor.role === 'CUSTOMER') {
      throw new ForbiddenError();
    }

    const ticket = await resolveTicketByNumber(this.ticketRepository, ticketIdParam);

    assertCanViewTicket(actor, ticket);

    const data = {
      ...buildStatusTransitionData(input.status, input.scheduledClosureAt),
      ...buildSlaPauseData(ticket.status, input.status, ticket.slaPausedAt, ticket.slaPausedDurationMs),
    };

    // Agenda/cancela na fila ANTES de gravar no banco: se a fila falhar (ex:
    // Redis fora do ar), o chamado não fica com um status "PENDING_CLOSURE"
    // que prometeria um fechamento automático que nunca vai rodar.
    await syncClosureSchedule(
      ticket.id,
      ticket.status,
      input.status,
      data.scheduledClosureAt ?? null,
      this.ticketClosureScheduler,
    );

    const updated = await this.ticketRepository.update(ticket.id, data);

    await this.ticketNotificationService.notifyTicketUpdated(updated, actor.userId, ['status']);

    return updated;
  }
}
