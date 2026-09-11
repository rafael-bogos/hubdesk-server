import { Ticket } from '../../../domain/entities/ticket.entity';
import { TicketNotifier } from '../../../domain/ports/ticket-notifier';
import { TicketRepository } from '../../../domain/repositories/ticket-repository';
import { Actor, CreateTicketInput } from '../../dtos/ticket.dto';

export class CreateTicketUseCase {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly ticketNotifier: TicketNotifier,
  ) {}

  async execute(input: CreateTicketInput, actor: Actor): Promise<Ticket> {
    const ticket = await this.ticketRepository.create({
      title: input.title,
      description: input.description,
      priority: input.priority,
      categoryId: input.categoryId,
      requesterId: actor.userId,
    });

    this.ticketNotifier.notifyTicketCreated({
      id: ticket.id,
      number: ticket.number,
      title: ticket.title,
      priority: ticket.priority,
      requesterId: ticket.requesterId,
    });

    return ticket;
  }
}
