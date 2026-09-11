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
  // Restringe a chamados sem responsável ou atribuídos a este id — usado
  // pra agentes não verem a fila de outros atendentes.
  visibleToAgentId?: string;
  // Filtro explícito por responsável (ex: admin filtrando a fila de um
  // atendente específico) — diferente de visibleToAgentId, que também inclui
  // chamados sem responsável.
  assigneeId?: string;
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
  findByNumber(number: number): Promise<Ticket | null>;
  list(filters: ListTicketsFilters): Promise<ListTicketsResult>;
  update(id: string, data: UpdateTicketData): Promise<Ticket>;
  setAssignees(id: string, userIds: string[]): Promise<Ticket>;
}
