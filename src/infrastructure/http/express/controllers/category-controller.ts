import { NextFunction, Request, Response } from 'express';
import { ListActiveCategoriesUseCase } from '../../../../application/use-cases/categories/list-active-categories.use-case';

export class CategoryController {
  constructor(private readonly listActiveCategoriesUseCase: ListActiveCategoriesUseCase) {}

  list = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await this.listActiveCategoriesUseCase.execute();
      res.status(200).json(categories.map((category) => ({ id: category.id, name: category.name })));
    } catch (err) {
      next(err);
    }
  };
}
