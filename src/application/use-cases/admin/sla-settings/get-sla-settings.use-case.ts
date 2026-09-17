import { SlaSettingsRepository } from '../../../../domain/repositories/sla-settings-repository';
import { AdminSlaSettingsOutput } from '../../../dtos/sla-settings.dto';

export class GetSlaSettingsUseCase {
  constructor(private readonly slaSettingsRepository: SlaSettingsRepository) {}

  async execute(): Promise<AdminSlaSettingsOutput> {
    const settings = await this.slaSettingsRepository.get();

    return {
      lowPriorityHours: settings.lowPriorityHours,
      mediumPriorityHours: settings.mediumPriorityHours,
      highPriorityHours: settings.highPriorityHours,
      urgentPriorityHours: settings.urgentPriorityHours,
      warningThresholdPercent: settings.warningThresholdPercent,
    };
  }
}
