import { AppError } from '../../../domain/errors/app-error';
import { FileStorage } from '../../../domain/ports/file-storage';
import { UserRepository } from '../../../domain/repositories/user-repository';

export interface GetAvatarOutput {
  buffer: Buffer;
  mimeType: string;
}

// Público (sem authenticate) — pra `<img src>` funcionar sem carregar
// Authorization header, mesmo padrão de GetLoginLogoUseCase.
export class GetAvatarUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly fileStorage: FileStorage,
  ) {}

  async execute(userId: string): Promise<GetAvatarOutput> {
    const user = await this.userRepository.findById(userId);

    if (!user || !user.avatarPath || !user.avatarMimeType) {
      throw new AppError('Nenhuma foto de perfil configurada', 404);
    }

    const buffer = await this.fileStorage.read(user.avatarPath);

    return { buffer, mimeType: user.avatarMimeType };
  }
}
