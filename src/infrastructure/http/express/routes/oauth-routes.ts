import express, { Router } from 'express';
import { OAuthController } from '../controllers/oauth-controller';
import { validate } from '../middleware/validate';
import { exchangeOAuthCodeSchema } from '../schemas/oauth.schemas';

// Ponte entre a sessão do better-auth (login via Google / OAuth customizado)
// e o nosso próprio JWT — ver comentário em better-auth-instance.ts. Nenhuma
// rota aqui usa `authenticate`: ou é pública (login-methods, start, complete
// — chamadas antes do usuário ter qualquer JWT), ou se autentica de outro
// jeito (exchange, pelo código de handoff; backchannel-logout, verificando a
// assinatura do próprio logout_token contra o provedor).
export const makeOAuthRouter = (oauthController: OAuthController) => {
  const router = Router();

  router.get('/auth/login-methods', oauthController.loginMethods);
  router.get('/auth/login-logo', oauthController.logo);
  router.get('/auth/oauth/start', oauthController.start);
  router.get('/auth/oauth/complete', oauthController.complete);
  router.post('/auth/oauth/exchange', validate(exchangeOAuthCodeSchema), oauthController.exchange);
  // Corpo é `application/x-www-form-urlencoded` (spec de back-channel
  // logout, não JSON) — o express.json() global em app.ts não parseia isso,
  // por isso o urlencoded() só aqui.
  router.post(
    '/auth/oauth/backchannel-logout',
    express.urlencoded({ extended: false }),
    oauthController.backchannelLogout,
  );

  return router;
};
