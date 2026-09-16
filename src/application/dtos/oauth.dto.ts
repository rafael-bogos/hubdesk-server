import { DefaultLoginMethod } from '../../domain/entities/login-settings.entity';

// Único payload público sobre métodos de login — nunca inclui client id/secret
// nem URLs de provedor (ver GetLoginMethodsUseCase).
export interface LoginMethodsOutput {
  emailPasswordEnabled: boolean;
  googleEnabled: boolean;
  customOAuthEnabled: boolean;
  // Não é secreto — é só o slug usado na URL de início do OAuth
  // (/auth/oauth/start?provider=<id>), a tela de login precisa dele.
  customOAuthProviderId: string | null;
  customOAuthProviderName: string | null;
  // Logo do provedor customizado, se o admin enviou uma — Google usa o ícone
  // padrão embutido no próprio botão, não passa por aqui.
  customOAuthLogoUrl: string | null;
  defaultMethod: DefaultLoginMethod;
}

export interface StartOAuthInput {
  provider: string;
}

export interface StartOAuthOutput {
  url: string;
  // Cookie(s) de state/PKCE que o better-auth grava nessa resposta — precisam
  // ser repassados pro navegador de verdade (ver comentário no use case).
  cookies: string[];
}

export interface ExchangeOAuthCodeInput {
  code: string;
}
