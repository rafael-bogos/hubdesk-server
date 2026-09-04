import { DashboardStats, DashboardStatsRepository } from '../../../domain/repositories/dashboard-stats-repository';

export class GetDashboardStatsUseCase {
  constructor(private readonly dashboardStatsRepository: DashboardStatsRepository) {}

  async execute(): Promise<DashboardStats> {
    return this.dashboardStatsRepository.getStats();
  }
}
