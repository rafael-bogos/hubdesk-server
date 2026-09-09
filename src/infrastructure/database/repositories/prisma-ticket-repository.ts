import { Prisma, PrismaClient, Ticket as PrismaTicket } from '@prisma/client';
import { Ticket, TicketPriority, TicketStatus } from '../../../domain/entities/ticket.entity';
import {
  CreateTicketData,
  ListTicketsFilters,
  ListTicketsResult,
  TicketRepository,
  UpdateTicketData,
} from '../../../domain/repositories/ticket-repository';

type PrismaTicketWithAssignees = PrismaTicket & { assignees: { userId: string }[] };

const toDomain = (ticket: PrismaTicketWithAssignees): Ticket => ({
  id: ticket.id,
  title: ticket.title,
  description: ticket.description,
  status: ticket.status as TicketStatus,
  priority: ticket.priority as TicketPriority,
  requesterId: ticket.requesterId,
  assigneeIds: ticket.assignees.map((assignee) => assignee.userId),
  categoryId: ticket.categoryId,
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
  closedAt: ticket.closedAt,
});

const includeAssignees = { assignees: { select: { userId: true } } } as const;

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
      include: includeAssignees,
    });

    return toDomain(ticket);
  }

  async findById(id: string): Promise<Ticket | null> {
    const ticket = await this.prisma.ticket.findUnique({ where: { id }, include: includeAssignees });
    return ticket ? toDomain(ticket) : null;
  }

  async list(filters: ListTicketsFilters): Promise<ListTicketsResult> {
    const where: Prisma.TicketWhereInput = {
      ...(filters.requesterId ? { requesterId: filters.requesterId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.visibleToAgentId
        ? {
            OR: [
              { assignees: { none: {} } },
              { assignees: { some: { userId: filters.visibleToAgentId } } },
            ],
          }
        : {}),
      ...(filters.assigneeId ? { assignees: { some: { userId: filters.assigneeId } } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: includeAssignees,
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
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.closedAt !== undefined ? { closedAt: data.closedAt } : {}),
      },
      include: includeAssignees,
    });

    return toDomain(ticket);
  }

  async setAssignees(id: string, userIds: string[]): Promise<Ticket> {
    const uniqueUserIds = [...new Set(userIds)];

    const [, , ticket] = await this.prisma.$transaction([
      this.prisma.ticketAssignee.deleteMany({ where: { ticketId: id } }),
      this.prisma.ticketAssignee.createMany({
        data: uniqueUserIds.map((userId) => ({ ticketId: id, userId })),
      }),
      this.prisma.ticket.update({
        where: { id },
        data: {},
        include: includeAssignees,
      }),
    ]);

    return toDomain(ticket);
  }
}
