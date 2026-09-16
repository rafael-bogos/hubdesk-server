import { FileStorage } from '../../../../domain/ports/file-storage';
import { LoginSettingsRepository } from '../../../../domain/repositories/login-settings-repository';
import { AdminLoginSettingsOutput } from '../../../dtos/login-settings.dto';
import { GetLoginSettingsUseCase } from './get-login-settings.use-case';

export interface UploadLoginLogoInput {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}

export class UploadLoginLogoUseCase {
  constructor(
    private readonly loginSettingsRepository: LoginSettingsRepository,
    private readonly fileStorage: FileStorage,
    private readonly getLoginSettingsUseCase: GetLoginSettingsUseCase,
  ) {}

  async execute(input: UploadLoginLogoInput): Promise<AdminLoginSettingsOutput> {
    const current = await this.loginSettingsRepository.get();

    const saved = await this.fileStorage.save({
      originalName: input.originalName,
      mimeType: input.mimeType,
      buffer: input.buffer,
    });

    if (current.customOAuthLogoPath) {
      // Best-effort: se o arquivo antigo já não existir mais por algum
      // motivo, não impede a troca pela nova logo.
      await this.fileStorage.delete(current.customOAuthLogoPath).catch(() => {});
    }

    await this.loginSettingsRepository.update({
      customOAuthLogoPath: saved.path,
      customOAuthLogoMimeType: input.mimeType,
    });

    return this.getLoginSettingsUseCase.execute();
  }
}
