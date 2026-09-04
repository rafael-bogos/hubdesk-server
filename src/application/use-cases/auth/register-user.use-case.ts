import { EmailAlreadyInUseError } from '../../../domain/errors/auth-errors';
import { PasswordHasher } from '../../../domain/ports/password-hasher';
import { TokenService } from '../../../domain/ports/token-service';
import { UserRepository } from '../../../domain/repositories/user-repository';
import { AuthTokensOutput, RegisterInput } from '../../dtos/auth.dto';

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute(input: RegisterInput): Promise<AuthTokensOutput> {
    const existingUser = await this.userRepository.findByEmail(input.email);

    if (existingUser) {
      throw new EmailAlreadyInUseError();
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    const user = await this.userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
    });

    const payload = { userId: user.id, role: user.role, tokenVersion: user.tokenVersion };

    return {
      accessToken: this.tokenService.generateAccessToken(payload),
      refreshToken: this.tokenService.generateRefreshToken(payload),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }
}
