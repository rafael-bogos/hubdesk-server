import { BetterAuthProvider } from '../../../infrastructure/auth/better-auth-instance';
import { AppError } from '../../../domain/errors/app-error';
import { env } from '../../../main/config/env';
import { StartOAuthInput, StartOAuthOutput } from '../../dtos/oauth.dto';

// Precisa ser chamado pelo NAVEGADOR de verdade (navegação de página inteira
// direto pra essa rota), não server-to-server: o better-auth grava um cookie
// de state/PKCE na resposta dessa chamada, que ele mesmo confere de volta
// quando o provedor redireciona pro callback — sem o navegador receber esse
// cookie aqui, o callback falha com "state_mismatch" (erro real encontrado
// testando com uma conta Google de verdade).
export class StartOAuthUseCase {
  constructor(private readonly betterAuthProvider: BetterAuthProvider) {}

  async execute(input: StartOAuthInput): Promise<StartOAuthOutput> {
    const auth = await this.betterAuthProvider.getInstance();

    const { response, headers } = await auth.api.signInSocial({
      body: {
        provider: input.provider,
        callbackURL: `${env.backendPublicUrl}/auth/oauth/complete`,
      },
      returnHeaders: true,
    });

    if (!response.url) {
      throw new AppError('Provedor de login não configurado', 400);
    }

    return { url: response.url, cookies: headers.getSetCookie() };
  }
}
