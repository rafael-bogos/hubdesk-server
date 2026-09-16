import { NextFunction, Request, Response } from 'express';
import { CompleteOAuthUseCase } from '../../../../application/use-cases/auth/complete-oauth.use-case';
import { ExchangeOAuthCodeUseCase } from '../../../../application/use-cases/auth/exchange-oauth-code.use-case';
import { GetLoginLogoUseCase } from '../../../../application/use-cases/auth/get-login-logo.use-case';
import { GetLoginMethodsUseCase } from '../../../../application/use-cases/auth/get-login-methods.use-case';
import { StartOAuthUseCase } from '../../../../application/use-cases/auth/start-oauth.use-case';
import { AppError } from '../../../../domain/errors/app-error';

// `auth.api.getSession` exige um `Headers` (Fetch API), não o
// `IncomingHttpHeaders` do Node — conversão simples o bastante pra não
// precisar do `fromNodeHeaders` do pacote (que exigiria mais um dynamic
// import só pra isso).
const toFetchHeaders = (headers: Request['headers']): Headers => {
  const result = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) value.forEach((v) => result.append(key, v));
    else if (value !== undefined) result.set(key, value);
  }
  return result;
};

export class OAuthController {
  constructor(
    private readonly getLoginMethodsUseCase: GetLoginMethodsUseCase,
    private readonly startOAuthUseCase: StartOAuthUseCase,
    private readonly completeOAuthUseCase: CompleteOAuthUseCase,
    private readonly exchangeOAuthCodeUseCase: ExchangeOAuthCodeUseCase,
    private readonly getLoginLogoUseCase: GetLoginLogoUseCase,
  ) {}

  loginMethods = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.getLoginMethodsUseCase.execute();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // Público — serve a logo do OAuth customizado pra tela de login exibir.
  logo = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { buffer, mimeType } = await this.getLoginLogoUseCase.execute();
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      // O helmet() aplica `Cross-Origin-Resource-Policy: same-origin` por
      // padrão em toda resposta — bloquearia o <img> da tela de login (outra
      // origem, :3000) de carregar essa imagem. Essa é a única rota
      // propositalmente pública/embutível de outra origem.
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.status(200).send(buffer);
    } catch (err) {
      next(err);
    }
  };

  // Chamado pelo NAVEGADOR (navegação de página inteira, o Next.js só
  // redireciona pra cá) — precisa ser assim, e não server-to-server, porque a
  // resposta grava um cookie de state/PKCE que o navegador tem que carregar
  // até o callback do provedor (senão dá "state_mismatch").
  start = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = typeof req.query.provider === 'string' ? req.query.provider : '';
      if (!provider) {
        throw new AppError('Parâmetro "provider" é obrigatório', 400);
      }
      const { url, cookies } = await this.startOAuthUseCase.execute({ provider });
      if (cookies.length > 0) {
        res.setHeader('Set-Cookie', cookies);
      }
      res.redirect(url);
    } catch (err) {
      next(err);
    }
  };

  // Chamado pelo navegador (redirect de página inteira) no fim da dança
  // OAuth — sempre responde com outro redirect, nunca com JSON.
  complete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const redirectUrl = await this.completeOAuthUseCase.execute(toFetchHeaders(req.headers));
      res.redirect(redirectUrl);
    } catch (err) {
      next(err);
    }
  };

  // Chamado server-to-server pelo Next.js pra trocar o código de handoff
  // pelo nosso JWT.
  exchange = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.exchangeOAuthCodeUseCase.execute(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
