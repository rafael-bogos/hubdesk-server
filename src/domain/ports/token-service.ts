import { Role } from '../entities/user.entity';

export interface TokenPayload {
  userId: string;
  role: Role;
  tokenVersion: number;
}

export interface TokenService {
  generateAccessToken(payload: TokenPayload): string;
  generateRefreshToken(payload: TokenPayload): string;
  verifyAccessToken(token: string): TokenPayload;
  verifyRefreshToken(token: string): TokenPayload;
}
