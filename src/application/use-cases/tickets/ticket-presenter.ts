import { Ticket } from '../../../domain/entities/ticket.entity';
import { UserRepository } from '../../../domain/repositories/user-repository';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export type EnrichedTicket = Ticket & {
  requester: UserSummary | null;
  assignee: UserSummary | null;
};

const toSummary = (user: { id: string; name: string; email: string } | undefined): UserSummary | null =>
  user ? { id: user.id, name: user.name, email: user.email } : null;

export const enrichTickets = async (tickets: Ticket[], userRepository: UserRepository): Promise<EnrichedTicket[]> => {
  const ids = new Set<string>();
  for (const ticket of tickets) {
    ids.add(ticket.requesterId);
    if (ticket.assigneeId) ids.add(ticket.assigneeId);
  }

  const users = await Promise.all([...ids].map((id) => userRepository.findById(id)));
  const byId = new Map(users.filter((user): user is NonNullable<typeof user> => user !== null).map((user) => [user.id, user]));

  return tickets.map((ticket) => ({
    ...ticket,
    requester: toSummary(byId.get(ticket.requesterId)),
    assignee: ticket.assigneeId ? toSummary(byId.get(ticket.assigneeId)) : null,
  }));
};

export const enrichTicket = async (ticket: Ticket, userRepository: UserRepository): Promise<EnrichedTicket> => {
  const [enriched] = await enrichTickets([ticket], userRepository);
  return enriched;
};
