import { LoginSettings as PrismaLoginSettings, PrismaClient } from '@prisma/client';
import { DefaultLoginMethod, LoginSettings } from '../../../domain/entities/login-settings.entity';
import {
  LoginSettingsRepository,
  UpdateLoginSettingsData,
} from '../../../domain/repositories/login-settings-repository';

const SINGLETON_ID = 'singleton';

const toDomain = (row: PrismaLoginSettings): LoginSettings => ({
  emailPasswordEnabled: row.emailPasswordEnabled,
  googleEnabled: row.googleEnabled,
  googleClientId: row.googleClientId,
  googleClientSecretEncrypted: row.googleClientSecretEncrypted,
  customOAuthEnabled: row.customOAuthEnabled,
  customOAuthProviderId: row.customOAuthProviderId,
  customOAuthProviderName: row.customOAuthProviderName,
  customOAuthClientId: row.customOAuthClientId,
  customOAuthClientSecretEncrypted: row.customOAuthClientSecretEncrypted,
  customOAuthAuthorizationUrl: row.customOAuthAuthorizationUrl,
  customOAuthTokenUrl: row.customOAuthTokenUrl,
  customOAuthUserInfoUrl: row.customOAuthUserInfoUrl,
  customOAuthScopes: row.customOAuthScopes,
  customOAuthIssuer: row.customOAuthIssuer,
  customOAuthJwksUrl: row.customOAuthJwksUrl,
  customOAuthLogoPath: row.customOAuthLogoPath,
  customOAuthLogoMimeType: row.customOAuthLogoMimeType,
  defaultMethod: row.defaultMethod as DefaultLoginMethod,
  updatedAt: row.updatedAt,
});

export class PrismaLoginSettingsRepository implements LoginSettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Lê a linha única, criando-a com os defaults do schema na primeira vez que
  // alguém pedir (evita depender de um passo de seed separado).
  async get(): Promise<LoginSettings> {
    const row = await this.prisma.loginSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID },
      update: {},
    });
    return toDomain(row);
  }

  async update(data: UpdateLoginSettingsData): Promise<LoginSettings> {
    const row = await this.prisma.loginSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data },
      update: data,
    });
    return toDomain(row);
  }
}
