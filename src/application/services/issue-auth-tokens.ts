import { User } from '../../domain/entities/user.entity';
import { TokenService } from '../../domain/ports/token-service';
import { AuthTokensOutput } from '../dtos/auth.dto';

// Mesma lógica de "gerar access+refresh pro usuário X" que
// login-user.use-case.ts já faz inline — extraída aqui só pra ser reusada
// pelo fluxo de OAuth (complete-oauth/exchange-oauth-code), sem duplicar e
// sem precisar tocar nos use cases de login/registro/refresh já existentes.
export const issueAuthTokens = (user: User, tokenService: TokenService): AuthTokensOutput => {
  const payload = { userId: user.id, role: user.role, tokenVersion: user.tokenVersion };

  return {
    accessToken: tokenService.generateAccessToken(payload),
    refreshToken: tokenService.generateRefreshToken(payload),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
};
