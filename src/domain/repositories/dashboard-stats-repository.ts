export interface AgentTicketCount {
  agentId: string;
  agentName: string;
  count: number;
}

export interface DashboardStats {
  ticketsByStatus: Record<string, number>;
  ticketsByPriority: Record<string, number>;
  openTicketsByAgent: AgentTicketCount[];
  usersByRole: Record<string, number>;
}

export interface DashboardStatsRepository {
  getStats(): Promise<DashboardStats>;
}
