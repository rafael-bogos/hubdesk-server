import { NextFunction, Request, Response } from 'express';
import { GetSlaSettingsUseCase } from '../../../../application/use-cases/admin/sla-settings/get-sla-settings.use-case';
import { UpdateSlaSettingsUseCase } from '../../../../application/use-cases/admin/sla-settings/update-sla-settings.use-case';

export class AdminSlaSettingsController {
  constructor(
    private readonly getSlaSettingsUseCase: GetSlaSettingsUseCase,
    private readonly updateSlaSettingsUseCase: UpdateSlaSettingsUseCase,
  ) {}

  get = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.getSlaSettingsUseCase.execute();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.updateSlaSettingsUseCase.execute(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
