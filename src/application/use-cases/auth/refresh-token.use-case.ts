import { UnauthorizedError } from '../../../domain/errors/auth-errors';
import { TokenService } from '../../../domain/ports/token-service';
import { UserRepository } from '../../../domain/repositories/user-repository';
import { AuthTokensOutput, RefreshInput } from '../../dtos/auth.dto';

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(input: RefreshInput): Promise<AuthTokensOutput> {
    let decoded;

    try {
      decoded = this.tokenService.verifyRefreshToken(input.refreshToken);
    } catch {
      throw new UnauthorizedError('Refresh token inválido ou expirado');
    }

    const user = await this.userRepository.findById(decoded.userId);

    if (!user || !user.active || user.tokenVersion !== decoded.tokenVersion) {
      throw new UnauthorizedError('Refresh token inválido ou expirado');
    }

    const payload = { userId: user.id, role: user.role, tokenVersion: user.tokenVersion };

    return {
      accessToken: this.tokenService.generateAccessToken(payload),
      refreshToken: this.tokenService.generateRefreshToken(payload),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }
}
