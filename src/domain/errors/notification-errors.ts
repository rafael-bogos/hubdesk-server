import { AppError } from './app-error';

export class NotificationNotFoundError extends AppError {
  constructor() {
    super('Notificação não encontrada', 404);
    this.name = 'NotificationNotFoundError';
  }
}
