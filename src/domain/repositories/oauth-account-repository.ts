// Ponte de leitura pra tabela `accounts` do better-auth (ver
// better-auth-instance.ts) — usada só pra resolver, a partir de um `sub`
// (accountId) confirmado por um `logout_token` de back-channel logout, qual
// usuário local do Hubdesk deve ser deslogado.
export interface OAuthAccountRepository {
  findUserIdByAccount(providerId: string, accountId: string): Promise<string | null>;
}
