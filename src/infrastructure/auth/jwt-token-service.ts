import jwt from 'jsonwebtoken';
import { TokenPayload, TokenService } from '../../domain/ports/token-service';

type TokenType = 'access' | 'refresh';
type SignedPayload = TokenPayload & { type: TokenType };

export interface JwtTokenServiceConfig {
  secret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

export class JwtTokenService implements TokenService {
  constructor(private readonly config: JwtTokenServiceConfig) {}

  generateAccessToken(payload: TokenPayload): string {
    return this.sign(payload, 'access', this.config.accessExpiresIn);
  }

  generateRefreshToken(payload: TokenPayload): string {
    return this.sign(payload, 'refresh', this.config.refreshExpiresIn);
  }

  verifyAccessToken(token: string): TokenPayload {
    return this.verify(token, 'access');
  }

  verifyRefreshToken(token: string): TokenPayload {
    return this.verify(token, 'refresh');
  }

  private sign(payload: TokenPayload, type: TokenType, expiresIn: string): string {
    const signedPayload: SignedPayload = { ...payload, type };
    return jwt.sign(signedPayload, this.config.secret, {
      expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  private verify(token: string, type: TokenType): TokenPayload {
    const decoded = jwt.verify(token, this.config.secret) as SignedPayload;

    if (decoded.type !== type) {
      throw new Error('Tipo de token inválido');
    }

    return { userId: decoded.userId, role: decoded.role, tokenVersion: decoded.tokenVersion };
  }
}
