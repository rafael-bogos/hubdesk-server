import { InvalidCredentialsError, UnauthorizedError } from '../../../domain/errors/auth-errors';
import { PasswordHasher } from '../../../domain/ports/password-hasher';
import { TokenService } from '../../../domain/ports/token-service';
import { UserRepository } from '../../../domain/repositories/user-repository';
import { AuthTokensOutput, ChangePasswordInput } from '../../dtos/auth.dto';

export class ChangePasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute(userId: string, input: ChangePasswordInput): Promise<AuthTokensOutput> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedError();
    }

    const currentPasswordMatches = await this.passwordHasher.compare(
      input.currentPassword,
      user.passwordHash,
    );

    if (!currentPasswordMatches) {
      throw new InvalidCredentialsError();
    }

    const passwordHash = await this.passwordHasher.hash(input.newPassword);
    await this.userRepository.update(userId, { passwordHash });

    // Invalida qualquer sessão existente (inclusive a atual) e emite tokens
    // novos abaixo, pra trocar a senha sem forçar um novo login.
    const updated = await this.userRepository.incrementTokenVersion(userId);

    const payload = { userId: updated.id, role: updated.role, tokenVersion: updated.tokenVersion };

    return {
      accessToken: this.tokenService.generateAccessToken(payload),
      refreshToken: this.tokenService.generateRefreshToken(payload),
      user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role },
    };
  }
}
