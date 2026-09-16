import { DefaultLoginMethod } from '../../domain/entities/login-settings.entity';

// Visão de admin (GET /admin/login-settings) — secrets nunca em texto puro,
// só um booleano dizendo se já tem um salvo.
export interface AdminLoginSettingsOutput {
  emailPasswordEnabled: boolean;

  googleEnabled: boolean;
  googleClientId: string | null;
  googleClientSecretSet: boolean;
  googleCallbackUrl: string;

  customOAuthEnabled: boolean;
  customOAuthProviderId: string | null;
  customOAuthProviderName: string | null;
  customOAuthClientId: string | null;
  customOAuthClientSecretSet: boolean;
  customOAuthAuthorizationUrl: string | null;
  customOAuthTokenUrl: string | null;
  customOAuthUserInfoUrl: string | null;
  customOAuthScopes: string | null;
  customOAuthIssuer: string | null;
  customOAuthJwksUrl: string | null;
  customOAuthCallbackUrl: string | null;
  // URL fixa (não depende de credenciais) pra registrar no provedor como
  // `backchannelLogoutUri` — null enquanto nenhum provider id foi salvo.
  customOAuthBackchannelLogoutUrl: string | null;
  // Aponta pro endpoint público que serve a imagem (com cache-busting) —
  // null enquanto nenhuma logo foi enviada, aí o botão usa um ícone genérico.
  customOAuthLogoUrl: string | null;

  defaultMethod: DefaultLoginMethod;
}

export interface LoginLogoOutput {
  buffer: Buffer;
  mimeType: string;
}

// Payload do PATCH — todos os campos opcionais. Secret ausente/vazio mantém
// o já salvo (nunca precisa reenviar o secret pra mudar outro campo).
export interface UpdateLoginSettingsInput {
  emailPasswordEnabled?: boolean;
  googleEnabled?: boolean;
  googleClientId?: string;
  googleClientSecret?: string;
  customOAuthEnabled?: boolean;
  customOAuthProviderId?: string;
  customOAuthProviderName?: string;
  customOAuthClientId?: string;
  customOAuthClientSecret?: string;
  customOAuthAuthorizationUrl?: string;
  customOAuthTokenUrl?: string;
  customOAuthUserInfoUrl?: string;
  customOAuthScopes?: string;
  customOAuthIssuer?: string;
  customOAuthJwksUrl?: string;
  defaultMethod?: DefaultLoginMethod;
}
