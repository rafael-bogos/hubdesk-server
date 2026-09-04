import { Router } from 'express';
import { HealthController } from '../controllers/health-controller';

export const healthRouter = Router();
const healthController = new HealthController();

healthRouter.get('/health', (req, res) => healthController.handle(req, res));
