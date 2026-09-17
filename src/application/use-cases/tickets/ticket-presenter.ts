import { SlaSettings } from '../../../domain/entities/sla-settings.entity';
import { Ticket } from '../../../domain/entities/ticket.entity';
import { CategoryRepository } from '../../../domain/repositories/category-repository';
import { UserRepository } from '../../../domain/repositories/user-repository';
import { calculateSla, SlaState } from '../../services/sla-calculator';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export interface CategorySummary {
  id: string;
  name: string;
}

export interface TicketSlaSummary {
  dueAt: Date;
  state: SlaState;
  percentConsumed: number;
  // Enquanto o chamado estiver em WAITING (o relógio de SLA congelado) — null
  // fora disso.
  pausedAt: Date | null;
}

export type EnrichedTicket = Ticket & {
  requester: UserSummary | null;
  assignees: UserSummary[];
  category: CategorySummary | null;
  sla: TicketSlaSummary;
};

const toSummary = (user: { id: string; name: string; email: string } | undefined): UserSummary | null =>
  user ? { id: user.id, name: user.name, email: user.email } : null;

const toCategorySummary = (category: { id: string; name: string } | undefined): CategorySummary | null =>
  category ? { id: category.id, name: category.name } : null;

export const enrichTickets = async (
  tickets: Ticket[],
  userRepository: UserRepository,
  categoryRepository: CategoryRepository,
  slaSettings: SlaSettings,
): Promise<EnrichedTicket[]> => {
  const userIds = new Set<string>();
  const categoryIds = new Set<string>();
  for (const ticket of tickets) {
    userIds.add(ticket.requesterId);
    for (const assigneeId of ticket.assigneeIds) userIds.add(assigneeId);
    if (ticket.categoryId) categoryIds.add(ticket.categoryId);
  }

  const [users, categories] = await Promise.all([
    Promise.all([...userIds].map((id) => userRepository.findById(id))),
    Promise.all([...categoryIds].map((id) => categoryRepository.findById(id))),
  ]);

  const usersById = new Map(users.filter((user): user is NonNullable<typeof user> => user !== null).map((user) => [user.id, user]));
  const categoriesById = new Map(
    categories.filter((category): category is NonNullable<typeof category> => category !== null).map((category) => [category.id, category]),
  );

  return tickets.map((ticket) => {
    const sla = calculateSla(ticket, slaSettings);
    return {
      ...ticket,
      requester: toSummary(usersById.get(ticket.requesterId)),
      assignees: ticket.assigneeIds
        .map((assigneeId) => toSummary(usersById.get(assigneeId)))
        .filter((summary): summary is UserSummary => summary !== null),
      category: ticket.categoryId ? toCategorySummary(categoriesById.get(ticket.categoryId)) : null,
      sla: {
        dueAt: sla.dueAt,
        state: sla.state,
        percentConsumed: Math.round(sla.percentConsumed),
        pausedAt: ticket.slaPausedAt,
      },
    };
  });
};

export const enrichTicket = async (
  ticket: Ticket,
  userRepository: UserRepository,
  categoryRepository: CategoryRepository,
  slaSettings: SlaSettings,
): Promise<EnrichedTicket> => {
  const [enriched] = await enrichTickets([ticket], userRepository, categoryRepository, slaSettings);
  return enriched;
};
