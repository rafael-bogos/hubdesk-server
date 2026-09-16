import { BetterAuthProvider } from '../../../../infrastructure/auth/better-auth-instance';
import { encryptSecret } from '../../../../infrastructure/crypto/secret-cipher';
import { AppError } from '../../../../domain/errors/app-error';
import { LoginSettings } from '../../../../domain/entities/login-settings.entity';
import { LoginSettingsRepository } from '../../../../domain/repositories/login-settings-repository';
import { AdminLoginSettingsOutput, UpdateLoginSettingsInput } from '../../../dtos/login-settings.dto';
import { GetLoginSettingsUseCase } from './get-login-settings.use-case';

export class UpdateLoginSettingsUseCase {
  constructor(
    private readonly loginSettingsRepository: LoginSettingsRepository,
    private readonly betterAuthProvider: BetterAuthProvider,
    private readonly getLoginSettingsUseCase: GetLoginSettingsUseCase,
  ) {}

  async execute(input: UpdateLoginSettingsInput): Promise<AdminLoginSettingsOutput> {
    const current = await this.loginSettingsRepository.get();

    // Estado final depois desse PATCH — valida em cima dele, não só nos
    // campos enviados, porque "habilitar Google" pode vir numa chamada
    // separada de "salvar as credenciais do Google".
    const next: LoginSettings = {
      ...current,
      ...(input.emailPasswordEnabled !== undefined && { emailPasswordEnabled: input.emailPasswordEnabled }),
      ...(input.googleEnabled !== undefined && { googleEnabled: input.googleEnabled }),
      ...(input.googleClientId !== undefined && { googleClientId: input.googleClientId }),
      ...(input.customOAuthEnabled !== undefined && { customOAuthEnabled: input.customOAuthEnabled }),
      ...(input.customOAuthProviderId !== undefined && { customOAuthProviderId: input.customOAuthProviderId }),
      ...(input.customOAuthProviderName !== undefined && { customOAuthProviderName: input.customOAuthProviderName }),
      ...(input.customOAuthClientId !== undefined && { customOAuthClientId: input.customOAuthClientId }),
      ...(input.customOAuthAuthorizationUrl !== undefined && {
        customOAuthAuthorizationUrl: input.customOAuthAuthorizationUrl,
      }),
      ...(input.customOAuthTokenUrl !== undefined && { customOAuthTokenUrl: input.customOAuthTokenUrl }),
      ...(input.customOAuthUserInfoUrl !== undefined && { customOAuthUserInfoUrl: input.customOAuthUserInfoUrl }),
      ...(input.customOAuthScopes !== undefined && { customOAuthScopes: input.customOAuthScopes }),
      ...(input.customOAuthIssuer !== undefined && { customOAuthIssuer: input.customOAuthIssuer }),
      ...(input.customOAuthJwksUrl !== undefined && { customOAuthJwksUrl: input.customOAuthJwksUrl }),
      ...(input.defaultMethod !== undefined && { defaultMethod: input.defaultMethod }),
      // Secret novo substitui; ausente/vazio mantém o já cifrado no banco.
      googleClientSecretEncrypted: input.googleClientSecret
        ? encryptSecret(input.googleClientSecret)
        : current.googleClientSecretEncrypted,
      customOAuthClientSecretEncrypted: input.customOAuthClientSecret
        ? encryptSecret(input.customOAuthClientSecret)
        : current.customOAuthClientSecretEncrypted,
    };

    if (!next.emailPasswordEnabled && !next.googleEnabled && !next.customOAuthEnabled) {
      throw new AppError('Pelo menos um método de login precisa ficar habilitado', 400);
    }

    if (next.googleEnabled && (!next.googleClientId || !next.googleClientSecretEncrypted)) {
      throw new AppError('Informe o client ID e o client secret do Google antes de habilitá-lo', 400);
    }

    // Client secret NÃO é exigido aqui de propósito: provedores OIDC públicos
    // (client PKCE-only, sem secret — ex: Comhub ID) são um caso válido, e o
    // better-auth aceita `clientSecret` ausente nesse cenário.
    if (
      next.customOAuthEnabled &&
      (!next.customOAuthProviderId ||
        !next.customOAuthProviderName ||
        !next.customOAuthClientId ||
        !next.customOAuthAuthorizationUrl ||
        !next.customOAuthTokenUrl ||
        !next.customOAuthUserInfoUrl)
    ) {
      throw new AppError(
        'Preencha nome, provider id, client ID e as 3 URLs do OAuth customizado antes de habilitá-lo',
        400,
      );
    }

    // `next` é um LoginSettings completo (inclui updatedAt herdado de
    // `current`) — sem excluir aqui, o Prisma recebe um valor explícito pro
    // campo @updatedAt e usa ele em vez de gerar um novo timestamp.
    const { updatedAt: _updatedAt, ...data } = next;
    await this.loginSettingsRepository.update(data);

    // Próxima chamada a getInstance() já reconstrói com os dados novos, sem
    // precisar reiniciar o servidor.
    this.betterAuthProvider.invalidate();

    return this.getLoginSettingsUseCase.execute();
  }
}
