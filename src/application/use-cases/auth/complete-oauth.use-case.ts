import { randomBytes } from 'node:crypto';
import { Redis } from 'ioredis';
import { BetterAuthProvider } from '../../../infrastructure/auth/better-auth-instance';
import { env } from '../../../main/config/env';

const HANDOFF_TTL_SECONDS = 60;
const handoffKey = (code: string) => `oauth-handoff:${code}`;

// Chamado pelo navegador no fim da dança OAuth (redirect do provedor -> do
// better-auth -> aqui). Nunca lança: quem chama isto é sempre um redirect de
// página inteira, não dá pra devolver um JSON de erro nesse ponto — "não
// achei sessão" também vira um redirect, só que de volta pro login com erro.
export class CompleteOAuthUseCase {
  constructor(
    private readonly betterAuthProvider: BetterAuthProvider,
    private readonly redis: Redis,
  ) {}

  async execute(headers: Headers): Promise<string> {
    const auth = await this.betterAuthProvider.getInstance();
    const session = await auth.api.getSession({ headers });

    if (!session) {
      return `${env.clientUrl}/login?error=oauth_failed`;
    }

    // Código de uso único: o navegador nunca vê o JWT aqui — só esse código,
    // trocado pelo Next.js server-to-server em ExchangeOAuthCodeUseCase.
    const code = randomBytes(24).toString('base64url');
    await this.redis.set(handoffKey(code), session.user.id, 'EX', HANDOFF_TTL_SECONDS);

    return `${env.clientUrl}/api/auth/oauth-callback?code=${code}`;
  }
}
