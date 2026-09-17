import { SlaSettings } from '../entities/sla-settings.entity';

// Linha única (upsert no id fixo "singleton") — não há filtro/paginação
// porque só existe uma configuração de SLA pro sistema inteiro.
export type UpdateSlaSettingsData = Partial<Omit<SlaSettings, 'updatedAt'>>;

export interface SlaSettingsRepository {
  get(): Promise<SlaSettings>;
  update(data: UpdateSlaSettingsData): Promise<SlaSettings>;
}
