import { Ticket, TicketPriority, TicketStatus } from '../entities/ticket.entity';

export interface CreateTicketData {
  title: string;
  description: string;
  priority?: TicketPriority;
  requesterId: string;
  categoryId?: string | null;
}

export interface UpdateTicketData {
  status?: TicketStatus;
  priority?: TicketPriority;
  categoryId?: string | null;
  closedAt?: Date | null;
}

export interface ListTicketsFilters {
  requesterId?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  categoryId?: string;
  page: number;
  pageSize: number;
}

export interface ListTicketsResult {
  items: Ticket[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TicketRepository {
  create(data: CreateTicketData): Promise<Ticket>;
  findById(id: string): Promise<Ticket | null>;
  list(filters: ListTicketsFilters): Promise<ListTicketsResult>;
  update(id: string, data: UpdateTicketData): Promise<Ticket>;
  setAssignees(id: string, userIds: string[]): Promise<Ticket>;
}
