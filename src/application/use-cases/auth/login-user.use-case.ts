import { InvalidCredentialsError } from '../../../domain/errors/auth-errors';
import { PasswordHasher } from '../../../domain/ports/password-hasher';
import { TokenService } from '../../../domain/ports/token-service';
import { UserRepository } from '../../../domain/repositories/user-repository';
import { AuthTokensOutput, LoginInput } from '../../dtos/auth.dto';

export class LoginUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute(input: LoginInput): Promise<AuthTokensOutput> {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user || !user.active) {
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.compare(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const payload = { userId: user.id, role: user.role, tokenVersion: user.tokenVersion };

    return {
      accessToken: this.tokenService.generateAccessToken(payload),
      refreshToken: this.tokenService.generateRefreshToken(payload),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }
}
