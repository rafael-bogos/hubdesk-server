import { NextFunction, Request, Response } from 'express';
import { GetDashboardStatsUseCase } from '../../../../application/use-cases/admin/get-dashboard-stats.use-case';

export class AdminDashboardController {
  constructor(private readonly getDashboardStatsUseCase: GetDashboardStatsUseCase) {}

  get = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.getDashboardStatsUseCase.execute();
      res.status(200).json(stats);
    } catch (err) {
      next(err);
    }
  };
}
