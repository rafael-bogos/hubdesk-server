import { NextFunction, Request, Response } from 'express';
import { CreateCategoryUseCase } from '../../../../application/use-cases/admin/categories/create-category.use-case';
import { ListCategoriesUseCase } from '../../../../application/use-cases/admin/categories/list-categories.use-case';
import { UpdateCategoryUseCase } from '../../../../application/use-cases/admin/categories/update-category.use-case';
import { UnauthorizedError } from '../../../../domain/errors/auth-errors';

export class AdminCategoryController {
  constructor(
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
  ) {}

  private actorId(req: Request): string {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    return req.user.userId;
  }

  list = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await this.listCategoriesUseCase.execute();
      res.status(200).json(categories);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = await this.createCategoryUseCase.execute(req.body, this.actorId(req));
      res.status(201).json(category);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const category = await this.updateCategoryUseCase.execute(id, req.body, this.actorId(req));
      res.status(200).json(category);
    } catch (err) {
      next(err);
    }
  };
}
