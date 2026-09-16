import { AppError } from '../../../domain/errors/app-error';
import { FileStorage } from '../../../domain/ports/file-storage';
import { LoginSettingsRepository } from '../../../domain/repositories/login-settings-repository';
import { LoginLogoOutput } from '../../dtos/login-settings.dto';

// Público (sem authenticate) — a tela de login precisa exibir a imagem antes
// de qualquer sessão existir.
export class GetLoginLogoUseCase {
  constructor(
    private readonly loginSettingsRepository: LoginSettingsRepository,
    private readonly fileStorage: FileStorage,
  ) {}

  async execute(): Promise<LoginLogoOutput> {
    const settings = await this.loginSettingsRepository.get();

    if (!settings.customOAuthLogoPath || !settings.customOAuthLogoMimeType) {
      throw new AppError('Nenhuma logo configurada', 404);
    }

    const buffer = await this.fileStorage.read(settings.customOAuthLogoPath);

    return { buffer, mimeType: settings.customOAuthLogoMimeType };
  }
}
