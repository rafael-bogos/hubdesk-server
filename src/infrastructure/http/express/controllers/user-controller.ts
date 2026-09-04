import { NextFunction, Request, Response } from 'express';
import { ListAgentsUseCase } from '../../../../application/use-cases/users/list-agents.use-case';

export class UserController {
  constructor(private readonly listAgentsUseCase: ListAgentsUseCase) {}

  listAgents = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const agents = await this.listAgentsUseCase.execute();
      res.status(200).json(
        agents.map((agent) => ({
          id: agent.id,
          name: agent.name,
          email: agent.email,
        })),
      );
    } catch (err) {
      next(err);
    }
  };
}
