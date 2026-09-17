import { SlaSettings as PrismaSlaSettings, PrismaClient } from '@prisma/client';
import { SlaSettings } from '../../../domain/entities/sla-settings.entity';
import { SlaSettingsRepository, UpdateSlaSettingsData } from '../../../domain/repositories/sla-settings-repository';

const SINGLETON_ID = 'singleton';

const toDomain = (row: PrismaSlaSettings): SlaSettings => ({
  lowPriorityHours: row.lowPriorityHours,
  mediumPriorityHours: row.mediumPriorityHours,
  highPriorityHours: row.highPriorityHours,
  urgentPriorityHours: row.urgentPriorityHours,
  warningThresholdPercent: row.warningThresholdPercent,
  updatedAt: row.updatedAt,
});

export class PrismaSlaSettingsRepository implements SlaSettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Lê a linha única, criando-a com os defaults do schema na primeira vez que
  // alguém pedir (evita depender de um passo de seed separado).
  async get(): Promise<SlaSettings> {
    const row = await this.prisma.slaSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID },
      update: {},
    });
    return toDomain(row);
  }

  async update(data: UpdateSlaSettingsData): Promise<SlaSettings> {
    const row = await this.prisma.slaSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data },
      update: data,
    });
    return toDomain(row);
  }
}
