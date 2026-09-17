import { RequestHandler } from 'express';
import { DeleteLoginLogoUseCase } from '../../application/use-cases/admin/login-settings/delete-login-logo.use-case';
import { GetLoginSettingsUseCase } from '../../application/use-cases/admin/login-settings/get-login-settings.use-case';
import { UpdateLoginSettingsUseCase } from '../../application/use-cases/admin/login-settings/update-login-settings.use-case';
import { UploadLoginLogoUseCase } from '../../application/use-cases/admin/login-settings/upload-login-logo.use-case';
import { BetterAuthProvider } from '../../infrastructure/auth/better-auth-instance';
import { AdminLoginSettingsController } from '../../infrastructure/http/express/controllers/admin-login-settings-controller';
import { makeLoginSettingsRouter } from '../../infrastructure/http/express/routes/login-settings-routes';
import { makeFileStorage } from '../../infrastructure/storage/make-file-storage';
import { LoginSettingsRepository } from '../../domain/repositories/login-settings-repository';

export const makeLoginSettingsModule = (
  authenticate: RequestHandler,
  loginSettingsRepository: LoginSettingsRepository,
  betterAuthProvider: BetterAuthProvider,
) => {
  const fileStorage = makeFileStorage();

  const getLoginSettingsUseCase = new GetLoginSettingsUseCase(loginSettingsRepository);
  const updateLoginSettingsUseCase = new UpdateLoginSettingsUseCase(
    loginSettingsRepository,
    betterAuthProvider,
    getLoginSettingsUseCase,
  );
  const uploadLoginLogoUseCase = new UploadLoginLogoUseCase(
    loginSettingsRepository,
    fileStorage,
    getLoginSettingsUseCase,
  );
  const deleteLoginLogoUseCase = new DeleteLoginLogoUseCase(
    loginSettingsRepository,
    fileStorage,
    getLoginSettingsUseCase,
  );

  const adminLoginSettingsController = new AdminLoginSettingsController(
    getLoginSettingsUseCase,
    updateLoginSettingsUseCase,
    uploadLoginLogoUseCase,
    deleteLoginLogoUseCase,
  );

  return {
    router: makeLoginSettingsRouter(adminLoginSettingsController, authenticate),
  };
};
