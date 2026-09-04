import { Ticket } from '../../../domain/entities/ticket.entity';
import { TicketRepository } from '../../../domain/repositories/ticket-repository';
import { Actor, CreateTicketInput } from '../../dtos/ticket.dto';

export class CreateTicketUseCase {
  constructor(private readonly ticketRepository: TicketRepository) {}

  async execute(input: CreateTicketInput, actor: Actor): Promise<Ticket> {
    return this.ticketRepository.create({
      title: input.title,
      description: input.description,
      priority: input.priority,
      categoryId: input.categoryId,
      requesterId: actor.userId,
    });
  }
}
