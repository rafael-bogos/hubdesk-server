import { FileStorage } from '../../../../domain/ports/file-storage';
import { LoginSettingsRepository } from '../../../../domain/repositories/login-settings-repository';
import { AdminLoginSettingsOutput } from '../../../dtos/login-settings.dto';
import { GetLoginSettingsUseCase } from './get-login-settings.use-case';

export class DeleteLoginLogoUseCase {
  constructor(
    private readonly loginSettingsRepository: LoginSettingsRepository,
    private readonly fileStorage: FileStorage,
    private readonly getLoginSettingsUseCase: GetLoginSettingsUseCase,
  ) {}

  async execute(): Promise<AdminLoginSettingsOutput> {
    const current = await this.loginSettingsRepository.get();

    if (current.customOAuthLogoPath) {
      await this.fileStorage.delete(current.customOAuthLogoPath).catch(() => {});
    }

    await this.loginSettingsRepository.update({
      customOAuthLogoPath: null,
      customOAuthLogoMimeType: null,
    });

    return this.getLoginSettingsUseCase.execute();
  }
}
