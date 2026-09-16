import { NextFunction, Request, Response } from 'express';
import { DeleteLoginLogoUseCase } from '../../../../application/use-cases/admin/login-settings/delete-login-logo.use-case';
import { GetLoginSettingsUseCase } from '../../../../application/use-cases/admin/login-settings/get-login-settings.use-case';
import { UpdateLoginSettingsUseCase } from '../../../../application/use-cases/admin/login-settings/update-login-settings.use-case';
import { UploadLoginLogoUseCase } from '../../../../application/use-cases/admin/login-settings/upload-login-logo.use-case';
import { AppError } from '../../../../domain/errors/app-error';

export class AdminLoginSettingsController {
  constructor(
    private readonly getLoginSettingsUseCase: GetLoginSettingsUseCase,
    private readonly updateLoginSettingsUseCase: UpdateLoginSettingsUseCase,
    private readonly uploadLoginLogoUseCase: UploadLoginLogoUseCase,
    private readonly deleteLoginLogoUseCase: DeleteLoginLogoUseCase,
  ) {}

  get = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.getLoginSettingsUseCase.execute();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.updateLoginSettingsUseCase.execute(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  uploadLogo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError('Arquivo é obrigatório', 400);
      }
      const result = await this.uploadLoginLogoUseCase.execute({
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        buffer: req.file.buffer,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  deleteLogo = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.deleteLoginLogoUseCase.execute();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
