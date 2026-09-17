import { PrismaClient } from '@prisma/client';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { toNodeHandler } from 'better-auth/node';
import { genericOAuth, type GenericOAuthUserInfo } from 'better-auth/plugins/generic-oauth';
import { LoginSettingsRepository } from '../../domain/repositories/login-settings-repository';
import { env } from '../../main/config/env';
import { decryptSecret } from '../crypto/secret-cipher';
import { logger } from '../logging/logger';

// Substitui o `fetchUserInfo` padrão do better-auth pra esse provedor: mesmo
// resultado quando dá certo, mas loga o motivo real quando falha. O padrão
// dele só loga a string genérica "Unable to get user info" — sem status,
// corpo da resposta ou nada que ajude a diagnosticar um provedor customizado
// (foi assim que o erro `unable_to_get_user_info` do Comhub ID apareceu sem
// nenhuma pista de causa).
const makeGetUserInfo =
  (userInfoUrl: string) =>
  async (tokens: { accessToken?: string }): Promise<GenericOAuthUserInfo | null> => {
    if (!tokens.accessToken) {
      logger.error('OAuth customizado: token exchange não retornou access_token');
      return null;
    }

    let response: Response;
    try {
      response = await fetch(userInfoUrl, { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
    } catch (err) {
      logger.error({ err, userInfoUrl }, 'OAuth customizado: erro de rede chamando o endpoint de userinfo');
      return null;
    }

    const bodyText = await response.text();

    if (!response.ok) {
      logger.error(
        { status: response.status, body: bodyText, userInfoUrl },
        'OAuth customizado: endpoint de userinfo respondeu com erro',
      );
      return null;
    }

    let profile: Record<string, unknown>;
    try {
      profile = JSON.parse(bodyText);
    } catch (err) {
      logger.error({ err, body: bodyText, userInfoUrl }, 'OAuth customizado: resposta de userinfo não é JSON válido');
      return null;
    }

    // O better-auth só trata o provedor como OIDC (e aí usa `sub` pra
    // identificar a conta) quando configurado via `discoveryUrl` — com URLs
    // manuais (nosso caso) ele cai no modo OAuth2 genérico e procura `id`,
    // que provedores OIDC "de verdade" (Comhub ID incluso) nunca mandam, só
    // `sub`. Sem isso o subject fica vazio e o login falha com
    // OAUTH_ACCOUNT_SUBJECT_INVALID mesmo com o userinfo funcionando certo.
    const subject = profile.sub ?? profile.id;
    if (typeof subject !== 'string' && typeof subject !== 'number') {
      logger.error(
        { profile, userInfoUrl },
        'OAuth customizado: resposta de userinfo não tem "sub" nem "id" — não dá pra identificar a conta',
      );
      return null;
    }

    return {
      ...profile,
      id: subject,
      email: typeof profile.email === 'string' ? profile.email : undefined,
      emailVerified: Boolean(profile.email_verified),
      name: typeof profile.name === 'string' ? profile.name : undefined,
      image: typeof profile.picture === 'string' ? profile.picture : undefined,
    };
  };

// better-auth é ESM-only (sem build CJS), mas Node 22+ sabe fazer
// `require()` de um pacote ESM nativamente ("Require ESM", estável desde o
// Node 22) — confirmado funcionando tanto compilado (`tsc` + `node`) quanto
// em dev (`tsx`) quanto sob o test runner (`vitest`, que roda os testes numa
// sandbox de VM sem callback de dynamic import — só um `import()`/`require()`
// estático como este funciona lá; um `new Function('return import(...)')`
// (tentativa anterior) quebra com ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING).
export { toNodeHandler };

// `Auth` (sem parametrizar pelas options concretas) — o resto do app só chama
// `.api.signInSocial(...)`/`.api.getSession(...)`, presentes independente de
// quais plugins/providers estão ativos; travar no tipo exato inferido da
// chamada de `betterAuth({...})` (com o array de plugins específico) causa
// erro de variância ao tentar devolver como um tipo mais genérico.
export type BetterAuthInstance = import('better-auth').Auth;

// Esse app não usa prefixo `/api` em nenhuma outra rota (tudo é `/auth`,
// `/tickets`, `/admin`, etc.) — por isso o better-auth monta em `/better-auth`
// em vez do `/api/auth` default dele, pra não conviver estranhamente com as
// rotas de ponte em `/auth/oauth/*` (ver oauth-routes.ts).
export const BETTER_AUTH_BASE_PATH = '/better-auth';

// Mantém o better-auth cuidando só da dança OAuth (achar/criar usuário,
// validar o provedor) — o Hubdesk continua emitindo seu próprio JWT depois
// (ver application/use-cases/auth/oauth-*), e o login por e-mail/senha
// continua 100% no fluxo de sempre, sem passar por aqui.
export class BetterAuthProvider {
  private cachedInstancePromise: Promise<BetterAuthInstance> | null = null;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly loginSettingsRepository: LoginSettingsRepository,
  ) {}

  getInstance(): Promise<BetterAuthInstance> {
    if (!this.cachedInstancePromise) {
      this.cachedInstancePromise = this.build();
    }
    return this.cachedInstancePromise;
  }

  // Chamado pelo use case de atualizar as configurações de login — a próxima
  // chamada a getInstance() reconstrói do zero com os dados novos, sem
  // precisar reiniciar o servidor.
  invalidate(): void {
    this.cachedInstancePromise = null;
  }

  private async build(): Promise<BetterAuthInstance> {
    const settings = await this.loginSettingsRepository.get();

    const socialProviders =
      settings.googleEnabled && settings.googleClientId && settings.googleClientSecretEncrypted
        ? {
            google: {
              clientId: settings.googleClientId,
              clientSecret: decryptSecret(settings.googleClientSecretEncrypted),
              // Sem isso, o better-auth só grava `name`/`image` do Google na
              // CRIAÇÃO da conta — quem já tinha conta antes desse campo
              // existir (ou trocou de foto no Google depois) nunca via a
              // foto atualizar em logins seguintes.
              overrideUserInfoOnSignIn: true,
            },
          }
        : undefined;

    // `clientSecret` fica de fora quando não há um salvo — provedores OIDC
    // públicos (PKCE-only, sem secret nenhum, ex: Comhub ID) são suportados
    // pelo better-auth normalmente nesse caso.
    const customOAuthConfig =
      settings.customOAuthEnabled &&
      settings.customOAuthProviderId &&
      settings.customOAuthClientId &&
      settings.customOAuthAuthorizationUrl &&
      settings.customOAuthTokenUrl &&
      settings.customOAuthUserInfoUrl
        ? [
            {
              providerId: settings.customOAuthProviderId,
              clientId: settings.customOAuthClientId,
              ...(settings.customOAuthClientSecretEncrypted
                ? { clientSecret: decryptSecret(settings.customOAuthClientSecretEncrypted) }
                : {}),
              authorizationUrl: settings.customOAuthAuthorizationUrl,
              tokenUrl: settings.customOAuthTokenUrl,
              userInfoUrl: settings.customOAuthUserInfoUrl,
              scopes: settings.customOAuthScopes?.split(/[\s,]+/).filter(Boolean),
              getUserInfo: makeGetUserInfo(settings.customOAuthUserInfoUrl),
              // Mesmo motivo do `overrideUserInfoOnSignIn` do Google acima —
              // sem isso o plugin genérico só atualiza `name`/`image` na
              // criação da conta.
              overrideUserInfo: true,
            },
          ]
        : [];

    return betterAuth({
      database: prismaAdapter(this.prisma, { provider: 'postgresql' }),
      baseURL: env.backendPublicUrl,
      basePath: BETTER_AUTH_BASE_PATH,
      secret: env.betterAuthSecret,
      trustedOrigins: [env.clientUrl],
      // Mantido fora: login por e-mail/senha continua no nosso próprio fluxo
      // (application/use-cases/auth), não no do better-auth.
      emailAndPassword: { enabled: false },
      ...(socialProviders ? { socialProviders } : {}),
      plugins: [genericOAuth({ config: customOAuthConfig })],
    }) as unknown as BetterAuthInstance;
  }
}
