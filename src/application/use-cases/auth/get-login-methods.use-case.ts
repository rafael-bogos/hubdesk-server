import { LoginSettingsRepository } from '../../../domain/repositories/login-settings-repository';
import { LoginMethodsOutput } from '../../dtos/oauth.dto';
import { buildLoginLogoUrl } from './login-logo-url';

// Endpoint público (sem authenticate) consumido pela tela de login, antes do
// usuário estar autenticado — por isso nunca inclui client id/secret/URLs.
export class GetLoginMethodsUseCase {
  constructor(private readonly loginSettingsRepository: LoginSettingsRepository) {}

  async execute(): Promise<LoginMethodsOutput> {
    const settings = await this.loginSettingsRepository.get();

    return {
      emailPasswordEnabled: settings.emailPasswordEnabled,
      googleEnabled: settings.googleEnabled,
      customOAuthEnabled: settings.customOAuthEnabled,
      customOAuthProviderId: settings.customOAuthProviderId,
      customOAuthProviderName: settings.customOAuthProviderName,
      customOAuthLogoUrl: buildLoginLogoUrl(settings),
      defaultMethod: settings.defaultMethod,
    };
  }
}
