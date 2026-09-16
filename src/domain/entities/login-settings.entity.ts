export type DefaultLoginMethod = 'google' | 'custom' | 'email';

export interface LoginSettings {
  emailPasswordEnabled: boolean;

  googleEnabled: boolean;
  googleClientId: string | null;
  // Nunca em texto puro fora desta camada — ver infrastructure/crypto/secret-cipher.ts.
  googleClientSecretEncrypted: string | null;

  customOAuthEnabled: boolean;
  customOAuthProviderId: string | null;
  customOAuthProviderName: string | null;
  customOAuthClientId: string | null;
  customOAuthClientSecretEncrypted: string | null;
  customOAuthAuthorizationUrl: string | null;
  customOAuthTokenUrl: string | null;
  customOAuthUserInfoUrl: string | null;
  customOAuthScopes: string | null;
  // Path no FileStorage (ver domain/ports/file-storage.ts) — null quando o
  // admin nunca enviou uma logo, aí a tela de login cai num ícone genérico.
  customOAuthLogoPath: string | null;
  customOAuthLogoMimeType: string | null;

  defaultMethod: DefaultLoginMethod;
  updatedAt: Date;
}
