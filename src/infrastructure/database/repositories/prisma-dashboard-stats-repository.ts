import { PrismaClient, Role, TicketPriority, TicketStatus } from '@prisma/client';
import {
  AgentTicketCount,
  DashboardStats,
  DashboardStatsRepository,
} from '../../../domain/repositories/dashboard-stats-repository';

const OPEN_STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING'];

const zeroed = <T extends string>(keys: readonly T[]): Record<T, number> =>
  Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;

export class PrismaDashboardStatsRepository implements DashboardStatsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getStats(): Promise<DashboardStats> {
    const [byStatus, byPriority, openByAssignee, byRole] = await Promise.all([
      this.prisma.ticket.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.ticket.groupBy({ by: ['priority'], _count: { _all: true } }),
      this.prisma.ticketAssignee.groupBy({
        by: ['userId'],
        where: { ticket: { status: { in: OPEN_STATUSES } } },
        _count: { _all: true },
      }),
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    ]);

    const ticketsByStatus = zeroed<TicketStatus>(['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED']);
    byStatus.forEach((row) => {
      ticketsByStatus[row.status] = row._count._all;
    });

    const ticketsByPriority = zeroed<TicketPriority>(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
    byPriority.forEach((row) => {
      ticketsByPriority[row.priority] = row._count._all;
    });

    const usersByRole = zeroed<Role>(['ADMIN', 'AGENT', 'CUSTOMER']);
    byRole.forEach((row) => {
      usersByRole[row.role] = row._count._all;
    });

    const agentIds = openByAssignee.map((row) => row.userId);
    const agents = agentIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true } })
      : [];
    const agentNameById = new Map(agents.map((agent) => [agent.id, agent.name]));

    const openTicketsByAgent: AgentTicketCount[] = openByAssignee.map((row) => ({
      agentId: row.userId,
      agentName: agentNameById.get(row.userId) ?? 'Desconhecido',
      count: row._count._all,
    }));

    return { ticketsByStatus, ticketsByPriority, openTicketsByAgent, usersByRole };
  }
}
