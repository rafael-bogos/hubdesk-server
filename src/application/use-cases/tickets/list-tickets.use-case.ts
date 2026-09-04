import { ListTicketsResult, TicketRepository } from '../../../domain/repositories/ticket-repository';
import { Actor, ListTicketsInput } from '../../dtos/ticket.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export class ListTicketsUseCase {
  constructor(private readonly ticketRepository: TicketRepository) {}

  async execute(input: ListTicketsInput, actor: Actor): Promise<ListTicketsResult> {
    const page = input.page && input.page > 0 ? input.page : DEFAULT_PAGE;
    const pageSize =
      input.pageSize && input.pageSize > 0 ? Math.min(input.pageSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;

    return this.ticketRepository.list({
      status: input.status,
      priority: input.priority,
      categoryId: input.categoryId,
      requesterId: actor.role === 'CUSTOMER' ? actor.userId : undefined,
      page,
      pageSize,
    });
  }
}
