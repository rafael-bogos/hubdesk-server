import { AppError } from './app-error';

export class CategoryNotFoundError extends AppError {
  constructor() {
    super('Categoria não encontrada', 404);
    this.name = 'CategoryNotFoundError';
  }
}
