import { AppError } from './app-error';

export class TicketNotFoundError extends AppError {
  constructor() {
    super('Chamado não encontrado', 404);
    this.name = 'TicketNotFoundError';
  }
}

export class AttachmentNotFoundError extends AppError {
  constructor() {
    super('Anexo não encontrado', 404);
    this.name = 'AttachmentNotFoundError';
  }
}

export class CommentNotFoundError extends AppError {
  constructor() {
    super('Comentário não encontrado', 404);
    this.name = 'CommentNotFoundError';
  }
}
