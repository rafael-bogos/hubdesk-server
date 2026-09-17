import { NextFunction, Request, Response } from 'express';
import { CreateUserUseCase } from '../../../../application/use-cases/admin/users/create-user.use-case';
import { DeleteUserUseCase } from '../../../../application/use-cases/admin/users/delete-user.use-case';
import { ListUsersUseCase } from '../../../../application/use-cases/admin/users/list-users.use-case';
import { UpdateUserUseCase } from '../../../../application/use-cases/admin/users/update-user.use-case';
import { User } from '../../../../domain/entities/user.entity';
import { UnauthorizedError } from '../../../../domain/errors/auth-errors';

const toSafeOutput = (user: User, categoryIds: string[] = []) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  active: user.active,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  categoryIds,
});

export class AdminUserController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  private actorId(req: Request): string {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    return req.user.userId;
  }

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.listUsersUseCase.execute(req.query);
      res.status(200).json({
        ...result,
        items: result.items.map(({ user, categoryIds }) => toSafeOutput(user, categoryIds)),
      });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.createUserUseCase.execute(req.body, this.actorId(req));
      res.status(201).json(toSafeOutput(user));
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { user, categoryIds } = await this.updateUserUseCase.execute(id, req.body, this.actorId(req));
      res.status(200).json(toSafeOutput(user, categoryIds));
    } catch (err) {
      next(err);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const user = await this.deleteUserUseCase.execute(id, this.actorId(req));
      res.status(200).json(toSafeOutput(user));
    } catch (err) {
      next(err);
    }
  };
}
