import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AppError } from '../../../domain/errors/app-error';
import { LoginSettingsRepository } from '../../../domain/repositories/login-settings-repository';
import { OAuthAccountRepository } from '../../../domain/repositories/oauth-account-repository';
import { UserRepository } from '../../../domain/repositories/user-repository';
import { logger } from '../../../infrastructure/logging/logger';

const LOGOUT_JWT_TYPE = 'logout+jwt';
const BACKCHANNEL_LOGOUT_EVENT = 'http://schemas.openid.net/event/backchannel-logout';

// Um `Map` (não um Set global só com a URL atual) porque o provedor
// customizado pode ser trocado em runtime (BetterAuthProvider.invalidate())
// — cacheia por jwksUrl pra não vazar a chave remota antiga presa em memória
// depois de uma troca, mas também não refazer o fetch a cada chamada.
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
const getRemoteJwks = (jwksUrl: string) => {
  let jwks = jwksCache.get(jwksUrl);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(jwksUrl));
    jwksCache.set(jwksUrl, jwks);
  }
  return jwks;
};

// Recebe o `logout_token` que QUALQUER provedor OIDC customizado configurado
// manda de forma assíncrona (fila de entrega dele, não síncrona com o clique
// de logout do usuário) quando uma sessão dele com refresh token vivo
// termina — genérico por design (só depende de customOAuthIssuer +
// customOAuthJwksUrl salvos, nada específico de um provedor). Ver
// docs/integracao-oidc.md do Comhub ID pra spec completa (primeira
// referência real usada aqui, mas o mecanismo vale pra qualquer OIDC
// compliant).
//
// Todo check abaixo é obrigatório (a doc do Comhub ID é explícita sobre
// isso) — cada um existe pra descartar uma forma específica de token forjado
// ou replay-ado.
export class HandleBackchannelLogoutUseCase {
  constructor(
    private readonly loginSettingsRepository: LoginSettingsRepository,
    private readonly oauthAccountRepository: OAuthAccountRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(logoutToken: string | undefined): Promise<void> {
    if (!logoutToken) {
      throw new AppError('logout_token é obrigatório', 400);
    }

    const settings = await this.loginSettingsRepository.get();

    if (
      !settings.customOAuthEnabled ||
      !settings.customOAuthProviderId ||
      !settings.customOAuthClientId ||
      !settings.customOAuthIssuer ||
      !settings.customOAuthJwksUrl
    ) {
      // Sem issuer/jwks salvos não tem contra o que verificar a assinatura —
      // não dá pra confiar em nenhum logout_token nesse estado. "Nunca
      // registrei um backchannelLogoutUri" (do lado do provedor) cai aqui
      // também, na prática: ele nunca chega a chamar essa rota.
      throw new AppError('Back-channel logout não está configurado para nenhum provedor customizado', 400);
    }

    let payload: Awaited<ReturnType<typeof jwtVerify>>['payload'];
    let typ: string | undefined;
    try {
      const verified = await jwtVerify(logoutToken, getRemoteJwks(settings.customOAuthJwksUrl), {
        issuer: settings.customOAuthIssuer,
        audience: settings.customOAuthClientId,
      });
      payload = verified.payload;
      typ = verified.protectedHeader.typ;
    } catch (err) {
      logger.warn({ err }, 'Back-channel logout: logout_token com assinatura, issuer ou audience inválidos');
      throw new AppError('logout_token inválido', 400);
    }

    // Distingue um logout_token genuíno de um id_token roubado e
    // replay-ado contra esse endpoint.
    if (typ !== LOGOUT_JWT_TYPE) {
      throw new AppError('logout_token com "typ" inválido (esperado "logout+jwt")', 400);
    }

    const events = payload.events;
    if (typeof events !== 'object' || events === null || !(BACKCHANNEL_LOGOUT_EVENT in events)) {
      throw new AppError('logout_token sem o evento de back-channel logout esperado', 400);
    }

    // Um logout_token de verdade nunca tem `nonce` — presença de um indica
    // replay de um id_token (que sempre tem), não um evento de logout.
    if ('nonce' in payload) {
      throw new AppError('logout_token não deveria conter "nonce" (possível replay de id_token)', 400);
    }

    const sub = payload.sub;
    if (!sub) {
      throw new AppError('logout_token sem "sub"', 400);
    }

    const userId = await this.oauthAccountRepository.findUserIdByAccount(settings.customOAuthProviderId, sub);
    if (!userId) {
      // Não é um erro do provedor — só não existe (ou não existe mais) conta
      // local vinculada a esse sub. Responde OK do mesmo jeito.
      logger.info({ sub }, 'Back-channel logout: nenhuma conta local vinculada a esse sub');
      return;
    }

    // `sid` representa a sessão inteira do usuário no provedor, reciclada em
    // todo login futuro enquanto ela continuar viva por lá — por isso a doc
    // do Comhub ID pede pra NUNCA tratar "esse sid" como banido pra sempre
    // (um login novo reaproveitando o mesmo sid seria barrado). O
    // `tokenVersion` que já usamos pro logout manual (LogoutUserUseCase) tem
    // exatamente a semântica certa sem precisar rastrear sid/iat: incrementar
    // agora invalida todo JWT já emitido até aqui, mas qualquer login novo
    // (deste ou de outro provedor) sempre embute o tokenVersion atual — nunca
    // fica preso mesmo reaproveitando o mesmo sid.
    await this.userRepository.incrementTokenVersion(userId);
    logger.info({ userId }, 'Back-channel logout: sessões locais desse usuário revogadas');
  }
}
