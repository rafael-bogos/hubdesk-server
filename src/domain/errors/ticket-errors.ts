import { AppError } from './app-error';

export class TicketNotFoundError extends AppError {
  constructor() {
    super('Chamado não encontrado', 404);
    this.name = 'TicketNotFoundError';
  }
}
