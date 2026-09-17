import { FileStorage } from '../../../domain/ports/file-storage';
import { UserRepository } from '../../../domain/repositories/user-repository';
import { UnauthorizedError } from '../../../domain/errors/auth-errors';

export class DeleteAvatarUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly fileStorage: FileStorage,
  ) {}

  async execute(userId: string): Promise<void> {
    const current = await this.userRepository.findById(userId);
    if (!current) {
      throw new UnauthorizedError();
    }

    if (current.avatarPath) {
      await this.fileStorage.delete(current.avatarPath).catch(() => {});
    }

    // Zera também `image` (foto do provedor OAuth) — "remover foto" precisa
    // valer de verdade mesmo pra quem nunca fez upload próprio, senão ela
    // reaparece na hora por causa do fallback em buildAvatarUrl.
    await this.userRepository.update(userId, { avatarPath: null, avatarMimeType: null, image: null });
  }
}
