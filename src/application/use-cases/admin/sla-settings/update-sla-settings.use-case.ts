import { SlaSettings } from '../../../../domain/entities/sla-settings.entity';
import { AppError } from '../../../../domain/errors/app-error';
import { SlaSettingsRepository } from '../../../../domain/repositories/sla-settings-repository';
import { AdminSlaSettingsOutput, UpdateSlaSettingsInput } from '../../../dtos/sla-settings.dto';
import { GetSlaSettingsUseCase } from './get-sla-settings.use-case';

const HOURS_FIELDS = [
  ['lowPriorityHours', 'baixa'],
  ['mediumPriorityHours', 'média'],
  ['highPriorityHours', 'alta'],
  ['urgentPriorityHours', 'urgente'],
] as const;

export class UpdateSlaSettingsUseCase {
  constructor(
    private readonly slaSettingsRepository: SlaSettingsRepository,
    private readonly getSlaSettingsUseCase: GetSlaSettingsUseCase,
  ) {}

  async execute(input: UpdateSlaSettingsInput): Promise<AdminSlaSettingsOutput> {
    const current = await this.slaSettingsRepository.get();

    // Estado final depois desse PATCH — valida em cima dele, não só nos
    // campos enviados, já que cada prioridade pode ser ajustada numa chamada
    // separada.
    const next: SlaSettings = {
      ...current,
      ...(input.lowPriorityHours !== undefined && { lowPriorityHours: input.lowPriorityHours }),
      ...(input.mediumPriorityHours !== undefined && { mediumPriorityHours: input.mediumPriorityHours }),
      ...(input.highPriorityHours !== undefined && { highPriorityHours: input.highPriorityHours }),
      ...(input.urgentPriorityHours !== undefined && { urgentPriorityHours: input.urgentPriorityHours }),
      ...(input.warningThresholdPercent !== undefined && {
        warningThresholdPercent: input.warningThresholdPercent,
      }),
    };

    for (const [field, label] of HOURS_FIELDS) {
      const hours = next[field];
      if (!Number.isInteger(hours) || hours <= 0) {
        throw new AppError(
          `O prazo de SLA da prioridade ${label} precisa ser um número inteiro de horas maior que zero`,
          400,
        );
      }
    }

    if (
      !Number.isInteger(next.warningThresholdPercent) ||
      next.warningThresholdPercent < 1 ||
      next.warningThresholdPercent > 99
    ) {
      throw new AppError('O limiar de aviso precisa ser um número inteiro entre 1 e 99', 400);
    }

    // `next` inclui `updatedAt` herdado de `current` — sem excluir aqui, o
    // Prisma receberia um valor explícito pro campo @updatedAt em vez de
    // gerar um novo timestamp.
    const { updatedAt: _updatedAt, ...data } = next;
    await this.slaSettingsRepository.update(data);

    return this.getSlaSettingsUseCase.execute();
  }
}
