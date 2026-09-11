import { CategoryRepository } from '../../../domain/repositories/category-repository';
import { TicketRepository } from '../../../domain/repositories/ticket-repository';
import { UserRepository } from '../../../domain/repositories/user-repository';
import { Actor, ListTicketsInput } from '../../dtos/ticket.dto';
import { EnrichedTicket, enrichTickets } from './ticket-presenter';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface ListTicketsOutput {
  items: EnrichedTicket[];
  total: number;
  page: number;
  pageSize: number;
}

export class ListTicketsUseCase {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly userRepository: UserRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(input: ListTicketsInput, actor: Actor): Promise<ListTicketsOutput> {
    const page = input.page && input.page > 0 ? input.page : DEFAULT_PAGE;
    const pageSize =
      input.pageSize && input.pageSize > 0 ? Math.min(input.pageSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;

    const result = await this.ticketRepository.list({
      status: input.status,
      priority: input.priority,
      categoryId: input.categoryId,
      // Só o ADMIN vê o filtro na UI, mas a restrição de visibilidade de
      // agente acima já impede um AGENT de usar isto pra espiar a fila de
      // outro atendente (a interseção das duas dá lista vazia).
      assigneeId: input.assigneeId,
      search: input.search?.trim() || undefined,
      requesterId: actor.role === 'CUSTOMER' ? actor.userId : undefined,
      visibleToAgentId: actor.role === 'AGENT' ? actor.userId : undefined,
      page,
      pageSize,
    });

    const items = await enrichTickets(result.items, this.userRepository, this.categoryRepository);

    return { ...result, items };
  }
}
