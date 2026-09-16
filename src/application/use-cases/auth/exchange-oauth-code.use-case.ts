import { Redis } from 'ioredis';
import { UnauthorizedError } from '../../../domain/errors/auth-errors';
import { TokenService } from '../../../domain/ports/token-service';
import { UserRepository } from '../../../domain/repositories/user-repository';
import { AuthTokensOutput } from '../../dtos/auth.dto';
import { ExchangeOAuthCodeInput } from '../../dtos/oauth.dto';
import { issueAuthTokens } from '../../services/issue-auth-tokens';

const handoffKey = (code: string) => `oauth-handoff:${code}`;

// Chamado server-to-server pelo Next.js — troca o código de handoff (gerado
// por CompleteOAuthUseCase) pelo nosso próprio par de JWT, do mesmo jeito que
// login-user.use-case.ts faz pro e-mail/senha.
export class ExchangeOAuthCodeUseCase {
  constructor(
    private readonly redis: Redis,
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(input: ExchangeOAuthCodeInput): Promise<AuthTokensOutput> {
    // GETDEL lê e apaga atomicamente — o código só pode ser trocado uma vez,
    // mesmo com duas tentativas concorrentes.
    const userId = await this.redis.getdel(handoffKey(input.code));

    if (!userId) {
      throw new UnauthorizedError('Código de login inválido ou expirado');
    }

    const user = await this.userRepository.findById(userId);

    if (!user || !user.active) {
      throw new UnauthorizedError();
    }

    return issueAuthTokens(user, this.tokenService);
  }
}
