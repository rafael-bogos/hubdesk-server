import { User } from '../../../../domain/entities/user.entity';
import {
  CannotDeleteAdminError,
  CannotDeleteSelfError,
  UserNotFoundError,
} from '../../../../domain/errors/auth-errors';
import { AuditLogger } from '../../../../domain/ports/audit-logger';
import { UserRepository } from '../../../../domain/repositories/user-repository';

export class DeleteUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(id: string, actorId: string): Promise<User> {
    if (id === actorId) {
      throw new CannotDeleteSelfError();
    }

    const existingUser = await this.userRepository.findById(id);

    if (!existingUser) {
      throw new UserNotFoundError();
    }

    if (existingUser.role === 'ADMIN') {
      throw new CannotDeleteAdminError();
    }

    // Exclusão lógica: desativa e invalida sessões, preservando o histórico de
    // chamados/comentários/anexos do usuário (sem FK cascade pra apagar de vez).
    await this.userRepository.update(id, { active: false });
    const user = await this.userRepository.incrementTokenVersion(id);

    await this.auditLogger.record({
      actorId,
      action: 'DELETE_USER',
      entity: 'User',
      entityId: id,
      metadata: { role: user.role },
    });

    return user;
  }
}
