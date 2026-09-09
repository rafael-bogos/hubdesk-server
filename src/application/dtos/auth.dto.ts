import { Role } from '../../domain/entities/user.entity';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface LogoutInput {
  userId: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface AuthenticatedUserOutput {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthTokensOutput {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUserOutput;
}
