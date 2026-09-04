import { Prisma, PrismaClient, Ticket as PrismaTicket } from '@prisma/client';
import { Ticket, TicketPriority, TicketStatus } from '../../../domain/entities/ticket.entity';
import {
  CreateTicketData,
  ListTicketsFilters,
  ListTicketsResult,
  TicketRepository,
  UpdateTicketData,
} from '../../../domain/repositories/ticket-repository';

const toDomain = (ticket: PrismaTicket): Ticket => ({
  id: ticket.id,
  title: ticket.title,
  description: ticket.description,
  status: ticket.status as TicketStatus,
  priority: ticket.priority as TicketPriority,
  requesterId: ticket.requesterId,
  assigneeId: ticket.assigneeId,
  categoryId: ticket.categoryId,
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
  closedAt: ticket.closedAt,
});

export class PrismaTicketRepository implements TicketRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateTicketData): Promise<Ticket> {
    const ticket = await this.prisma.ticket.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        requesterId: data.requesterId,
        categoryId: data.categoryId ?? undefined,
      },
    });

    return toDomain(ticket);
  }

  async findById(id: string): Promise<Ticket | null> {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    return ticket ? toDomain(ticket) : null;
  }

  async list(filters: ListTicketsFilters): Promise<ListTicketsResult> {
    const where: Prisma.TicketWhereInput = {
      ...(filters.requesterId ? { requesterId: filters.requesterId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { items: items.map(toDomain), total, page: filters.page, pageSize: filters.pageSize };
  }

  async update(id: string, data: UpdateTicketData): Promise<Ticket> {
    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.closedAt !== undefined ? { closedAt: data.closedAt } : {}),
      },
    });

    return toDomain(ticket);
  }
}
