import { Ticket } from '../../../domain/entities/ticket.entity';
import { TicketRepository } from '../../../domain/repositories/ticket-repository';
import { TicketNotificationService } from '../../services/ticket-notification-service';
import { Actor, CreateTicketInput } from '../../dtos/ticket.dto';

export class CreateTicketUseCase {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly ticketNotificationService: TicketNotificationService,
  ) {}

  async execute(input: CreateTicketInput, actor: Actor): Promise<Ticket> {
    const ticket = await this.ticketRepository.create({
      title: input.title,
      description: input.description,
      priority: input.priority,
      categoryId: input.categoryId,
      requesterId: actor.userId,
    });

    await this.ticketNotificationService.notifyTicketCreated(ticket);

    return ticket;
  }
}
