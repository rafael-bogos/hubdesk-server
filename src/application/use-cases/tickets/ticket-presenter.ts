import { Ticket } from '../../../domain/entities/ticket.entity';
import { CategoryRepository } from '../../../domain/repositories/category-repository';
import { UserRepository } from '../../../domain/repositories/user-repository';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export interface CategorySummary {
  id: string;
  name: string;
}

export type EnrichedTicket = Ticket & {
  requester: UserSummary | null;
  assignees: UserSummary[];
  category: CategorySummary | null;
};

const toSummary = (user: { id: string; name: string; email: string } | undefined): UserSummary | null =>
  user ? { id: user.id, name: user.name, email: user.email } : null;

const toCategorySummary = (category: { id: string; name: string } | undefined): CategorySummary | null =>
  category ? { id: category.id, name: category.name } : null;

export const enrichTickets = async (
  tickets: Ticket[],
  userRepository: UserRepository,
  categoryRepository: CategoryRepository,
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

  return tickets.map((ticket) => ({
    ...ticket,
    requester: toSummary(usersById.get(ticket.requesterId)),
    assignees: ticket.assigneeIds
      .map((assigneeId) => toSummary(usersById.get(assigneeId)))
      .filter((summary): summary is UserSummary => summary !== null),
    category: ticket.categoryId ? toCategorySummary(categoriesById.get(ticket.categoryId)) : null,
  }));
};

export const enrichTicket = async (
  ticket: Ticket,
  userRepository: UserRepository,
  categoryRepository: CategoryRepository,
): Promise<EnrichedTicket> => {
  const [enriched] = await enrichTickets([ticket], userRepository, categoryRepository);
  return enriched;
};
