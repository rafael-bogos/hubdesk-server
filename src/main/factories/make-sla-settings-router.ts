import { RequestHandler } from 'express';
import { GetSlaSettingsUseCase } from '../../application/use-cases/admin/sla-settings/get-sla-settings.use-case';
import { UpdateSlaSettingsUseCase } from '../../application/use-cases/admin/sla-settings/update-sla-settings.use-case';
import { SlaSettingsRepository } from '../../domain/repositories/sla-settings-repository';
import { AdminSlaSettingsController } from '../../infrastructure/http/express/controllers/admin-sla-settings-controller';
import { makeSlaSettingsRouter } from '../../infrastructure/http/express/routes/sla-settings-routes';

export const makeSlaSettingsModule = (authenticate: RequestHandler, slaSettingsRepository: SlaSettingsRepository) => {
  const getSlaSettingsUseCase = new GetSlaSettingsUseCase(slaSettingsRepository);
  const updateSlaSettingsUseCase = new UpdateSlaSettingsUseCase(slaSettingsRepository, getSlaSettingsUseCase);
  const adminSlaSettingsController = new AdminSlaSettingsController(getSlaSettingsUseCase, updateSlaSettingsUseCase);

  return {
    router: makeSlaSettingsRouter(adminSlaSettingsController, authenticate),
  };
};
