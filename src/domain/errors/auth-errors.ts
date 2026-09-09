import { AppError } from './app-error';

export class InvalidCredentialsError extends AppError {
  constructor() {
    super('Credenciais inválidas', 401);
    this.name = 'InvalidCredentialsError';
  }
}

export class EmailAlreadyInUseError extends AppError {
  constructor() {
    super('E-mail já está em uso', 409);
    this.name = 'EmailAlreadyInUseError';
  }
}

export class UserNotFoundError extends AppError {
  constructor() {
    super('Usuário não encontrado', 404);
    this.name = 'UserNotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autenticado') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class CannotDeleteSelfError extends AppError {
  constructor() {
    super('Você não pode excluir sua própria conta', 400);
    this.name = 'CannotDeleteSelfError';
  }
}

export class CannotDeleteAdminError extends AppError {
  constructor() {
    super('Não é possível excluir uma conta de administrador', 400);
    this.name = 'CannotDeleteAdminError';
  }
}
