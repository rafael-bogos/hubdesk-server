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
  number: ticket.number,
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
  scheduledClosureAt: ticket.scheduledClosureAt,
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

  async findByNumber(number: number): Promise<Ticket | null> {
    const ticket = await this.prisma.ticket.findUnique({ where: { number }, include: includeAssignees });
    return ticket ? toDomain(ticket) : null;
  }

  async list(filters: ListTicketsFilters): Promise<ListTicketsResult> {
    // visibleToAgentId e search usam `OR` cada um — não dá pra colocar os dois
    // soltos no mesmo objeto (a segunda chave `OR` sobrescreveria a primeira),
    // então cada um vira uma condição própria dentro de um `AND`.
    const andConditions: Prisma.TicketWhereInput[] = [];

    if (filters.visibleToAgentId) {
      andConditions.push({
        OR: [
          { assignees: { none: {} } },
          { assignees: { some: { userId: filters.visibleToAgentId } } },
        ],
      });
    }

    if (filters.search) {
      const searchConditions: Prisma.TicketWhereInput[] = [
        { title: { contains: filters.search, mode: 'insensitive' } },
      ];
      const asNumber = Number(filters.search);
      if (Number.isInteger(asNumber)) {
        searchConditions.push({ number: asNumber });
      }
      andConditions.push({ OR: searchConditions });
    }

    // `status` explícito sempre vence; sem ele, `resolved` decide se mostra só
    // resolvidos, só os ativos (tudo que não é RESOLVED), ou não filtra por
    // status nenhum (nenhum dos dois informado).
    const statusFilter: Prisma.TicketWhereInput['status'] = filters.status
      ? filters.status
      : filters.resolved === true
        ? 'RESOLVED'
        : filters.resolved === false
          ? { not: 'RESOLVED' }
          : undefined;

    const where: Prisma.TicketWhereInput = {
      ...(filters.requesterId ? { requesterId: filters.requesterId } : {}),
      ...(statusFilter !== undefined ? { status: statusFilter } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.assigneeId ? { assignees: { some: { userId: filters.assigneeId } } } : {}),
      ...(andConditions.length > 0 ? { AND: andConditions } : {}),
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
        ...(data.scheduledClosureAt !== undefined ? { scheduledClosureAt: data.scheduledClosureAt } : {}),
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
