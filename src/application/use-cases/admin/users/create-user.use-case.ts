import { User } from '../../../../domain/entities/user.entity';
import { EmailAlreadyInUseError } from '../../../../domain/errors/auth-errors';
import { AuditLogger } from '../../../../domain/ports/audit-logger';
import { PasswordHasher } from '../../../../domain/ports/password-hasher';
import { UserRepository } from '../../../../domain/repositories/user-repository';
import { CreateUserInput } from '../../../dtos/admin.dto';

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(input: CreateUserInput, actorId: string): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(input.email);

    if (existingUser) {
      throw new EmailAlreadyInUseError();
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    const user = await this.userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
    });

    await this.auditLogger.record({
      actorId,
      action: 'CREATE_USER',
      entity: 'User',
      entityId: user.id,
      metadata: { role: user.role },
    });

    return user;
  }
}
