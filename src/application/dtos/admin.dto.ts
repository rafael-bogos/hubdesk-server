import { Role } from '../../domain/entities/user.entity';

export interface ListUsersInput {
  role?: Role;
  active?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: Role;
  active?: boolean;
  // Restringe (role AGENT) a essas categorias — vê/pode se auto-atribuir só
  // a chamados sem responsável delas. Ausente = não mexe; [] = remove toda
  // restrição (agente passa a ver tudo de novo).
  categoryIds?: string[];
}

export interface CreateCategoryInput {
  name: string;
  active?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  active?: boolean;
}
