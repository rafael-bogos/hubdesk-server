import { LoginSettings } from '../entities/login-settings.entity';

// Linha única (upsert no id fixo "singleton") — não há filtro/paginação
// porque só existe uma configuração pro sistema inteiro.
export type UpdateLoginSettingsData = Partial<Omit<LoginSettings, 'updatedAt'>>;

export interface LoginSettingsRepository {
  get(): Promise<LoginSettings>;
  update(data: UpdateLoginSettingsData): Promise<LoginSettings>;
}
