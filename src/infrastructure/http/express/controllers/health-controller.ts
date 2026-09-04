import { Request, Response } from 'express';

export class HealthController {
  handle(_req: Request, res: Response) {
    res.status(200).json({ status: 'ok' });
  }
}
