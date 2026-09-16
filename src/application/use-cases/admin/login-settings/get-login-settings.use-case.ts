import { BETTER_AUTH_BASE_PATH } from '../../../../infrastructure/auth/better-auth-instance';
import { LoginSettingsRepository } from '../../../../domain/repositories/login-settings-repository';
import { env } from '../../../../main/config/env';
import { AdminLoginSettingsOutput } from '../../../dtos/login-settings.dto';
import { buildLoginLogoUrl } from '../../auth/login-logo-url';

export class GetLoginSettingsUseCase {
  constructor(private readonly loginSettingsRepository: LoginSettingsRepository) {}

  async execute(): Promise<AdminLoginSettingsOutput> {
    const settings = await this.loginSettingsRepository.get();

    return {
      emailPasswordEnabled: settings.emailPasswordEnabled,

      googleEnabled: settings.googleEnabled,
      googleClientId: settings.googleClientId,
      googleClientSecretSet: settings.googleClientSecretEncrypted !== null,
      googleCallbackUrl: `${env.backendPublicUrl}${BETTER_AUTH_BASE_PATH}/callback/google`,

      customOAuthEnabled: settings.customOAuthEnabled,
      customOAuthProviderId: settings.customOAuthProviderId,
      customOAuthProviderName: settings.customOAuthProviderName,
      customOAuthClientId: settings.customOAuthClientId,
      customOAuthClientSecretSet: settings.customOAuthClientSecretEncrypted !== null,
      customOAuthAuthorizationUrl: settings.customOAuthAuthorizationUrl,
      customOAuthTokenUrl: settings.customOAuthTokenUrl,
      customOAuthUserInfoUrl: settings.customOAuthUserInfoUrl,
      customOAuthScopes: settings.customOAuthScopes,
      customOAuthIssuer: settings.customOAuthIssuer,
      customOAuthJwksUrl: settings.customOAuthJwksUrl,
      customOAuthCallbackUrl: settings.customOAuthProviderId
        ? `${env.backendPublicUrl}${BETTER_AUTH_BASE_PATH}/callback/${settings.customOAuthProviderId}`
        : null,
      // URL fixa (não muda por provider id) — o admin registra ela no
      // provedor customizado como `backchannelLogoutUri`. Só faz sentido
      // mostrar quando existe um provedor customizado configurado.
      customOAuthBackchannelLogoutUrl: settings.customOAuthProviderId
        ? `${env.backendPublicUrl}/auth/oauth/backchannel-logout`
        : null,
      customOAuthLogoUrl: buildLoginLogoUrl(settings),

      defaultMethod: settings.defaultMethod,
    };
  }
}
