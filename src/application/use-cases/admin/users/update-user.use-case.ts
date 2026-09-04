import { User } from '../../../../domain/entities/user.entity';
import { EmailAlreadyInUseError, UserNotFoundError } from '../../../../domain/errors/auth-errors';
import { AuditLogger } from '../../../../domain/ports/audit-logger';
import { UserRepository } from '../../../../domain/repositories/user-repository';
import { UpdateUserInput } from '../../../dtos/admin.dto';

export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(id: string, input: UpdateUserInput, actorId: string): Promise<User> {
    const existingUser = await this.userRepository.findById(id);

    if (!existingUser) {
      throw new UserNotFoundError();
    }

    if (input.email && input.email !== existingUser.email) {
      const emailOwner = await this.userRepository.findByEmail(input.email);
      if (emailOwner && emailOwner.id !== id) {
        throw new EmailAlreadyInUseError();
      }
    }

    // Mudar role ou active precisa invalidar sessões existentes imediatamente
    // (ex: revogar acesso de um agente demitido não pode esperar o token expirar).
    const accessChanged =
      (input.role !== undefined && input.role !== existingUser.role) ||
      (input.active !== undefined && input.active !== existingUser.active);

    let user = await this.userRepository.update(id, {
      name: input.name,
      email: input.email,
      role: input.role,
      active: input.active,
    });

    if (accessChanged) {
      user = await this.userRepository.incrementTokenVersion(id);
    }

    await this.auditLogger.record({
      actorId,
      action: accessChanged ? 'UPDATE_USER_ACCESS' : 'UPDATE_USER',
      entity: 'User',
      entityId: id,
      metadata: { role: user.role, active: user.active },
    });

    return user;
  }
}
