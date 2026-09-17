import { FileStorage } from '../../../domain/ports/file-storage';
import { UserRepository } from '../../../domain/repositories/user-repository';
import { UnauthorizedError } from '../../../domain/errors/auth-errors';
import { buildAvatarUrl } from './avatar-url';

export interface UploadAvatarInput {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}

export class UploadAvatarUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly fileStorage: FileStorage,
  ) {}

  async execute(userId: string, input: UploadAvatarInput): Promise<{ avatarUrl: string | null }> {
    const current = await this.userRepository.findById(userId);
    if (!current) {
      throw new UnauthorizedError();
    }

    const saved = await this.fileStorage.save({
      originalName: input.originalName,
      mimeType: input.mimeType,
      buffer: input.buffer,
    });

    if (current.avatarPath) {
      // Best-effort: se o arquivo antigo já não existir mais por algum
      // motivo, não impede a troca pela nova foto.
      await this.fileStorage.delete(current.avatarPath).catch(() => {});
    }

    const updated = await this.userRepository.update(userId, {
      avatarPath: saved.path,
      avatarMimeType: input.mimeType,
    });

    return { avatarUrl: buildAvatarUrl(updated) };
  }
}
