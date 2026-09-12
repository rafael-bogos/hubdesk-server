import { Role } from '../../domain/entities/user.entity';
import { TicketPriority, TicketStatus } from '../../domain/entities/ticket.entity';

export interface Actor {
  userId: string;
  role: Role;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  priority?: TicketPriority;
  categoryId?: string | null;
}

export interface ListTicketsInput {
  status?: TicketStatus;
  priority?: TicketPriority;
  categoryId?: string;
  assigneeId?: string;
  // Separa a fila principal dos chamados já resolvidos — ver
  // ListTicketsFilters.resolved.
  resolved?: boolean;
  // Casa por número exato (se for um inteiro válido) ou por trecho do título
  // (case-insensitive).
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface UpdateTicketStatusInput {
  status: TicketStatus;
}

export interface AssignTicketInput {
  assigneeIds: string[];
}

export interface AddCommentInput {
  body: string;
  isInternal?: boolean;
}

export interface UpdateCommentInternalInput {
  isInternal: boolean;
}

export interface UpdateAttachmentInternalInput {
  isInternal: boolean;
}

export interface AddAttachmentInput {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  commentId?: string | null;
  isInternal?: boolean;
}
