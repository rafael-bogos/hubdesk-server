import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { exportJWK, generateKeyPair, SignJWT, type CryptoKey } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/infrastructure/database/prisma/client';
import { createApp } from '../src/main/app';

const app = createApp();

const PROVIDER_ID = 'test-provider';
const CLIENT_ID = 'test-client';
const ISSUER = 'https://issuer.example.com';
const KID = 'test-key';
const BACKCHANNEL_LOGOUT_EVENT = 'http://schemas.openid.net/event/backchannel-logout';

let jwksServer: Server;
let jwksUrl: string;
let privateKey: CryptoKey;

beforeAll(async () => {
  const { publicKey, privateKey: privKey } = await generateKeyPair('ES256');
  privateKey = privKey;
  const jwk = await exportJWK(publicKey);
  jwk.kid = KID;
  jwk.alg = 'ES256';
  jwk.use = 'sig';

  jwksServer = createServer((_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise<void>((resolve) => jwksServer.listen(0, resolve));
  const { port } = jwksServer.address() as AddressInfo;
  jwksUrl = `http://127.0.0.1:${port}/jwks`;
});

afterAll(async () => {
  await new Promise((resolve) => jwksServer.close(() => resolve(undefined)));
  await prisma.$disconnect();
});

const signLogoutToken = async (
  payloadOverrides: Record<string, unknown> = {},
  headerOverrides: Record<string, unknown> = {},
): Promise<string> => {
  return new SignJWT({
    events: { [BACKCHANNEL_LOGOUT_EVENT]: {} },
    ...payloadOverrides,
  })
    .setProtectedHeader({ alg: 'ES256', typ: 'logout+jwt', kid: KID, ...headerOverrides })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(CLIENT_ID)
    .sign(privateKey);
};

let userCounter = 0;

const registerAdmin = async (): Promise<{ userId: string; adminToken: string }> => {
  userCounter += 1;
  const email = `backchannel-admin${userCounter}@example.com`;
  await request(app).post('/auth/register').send({ name: 'Admin', email, password: 'password123' });
  const userId = (await request(app).post('/auth/login').send({ email, password: 'password123' })).body.user.id;
  await prisma.user.update({ where: { id: userId }, data: { role: 'ADMIN' } });
  const adminToken = (await request(app).post('/auth/login').send({ email, password: 'password123' })).body
    .accessToken;
  return { userId, adminToken };
};

const registerLinkedUser = async (sub: string): Promise<{ userId: string; accessToken: string }> => {
  userCounter += 1;
  const email = `backchannel-user${userCounter}@example.com`;
  await request(app).post('/auth/register').send({ name: 'OAuth User', email, password: 'password123' });
  const login = await request(app).post('/auth/login').send({ email, password: 'password123' });
  const userId: string = login.body.user.id;
  const accessToken: string = login.body.accessToken;

  await prisma.account.create({
    data: { providerId: PROVIDER_ID, accountId: sub, userId, updatedAt: new Date() },
  });

  return { userId, accessToken };
};

const enableCustomOAuthWithBackchannelLogout = async (adminToken: string) => {
  const response = await request(app)
    .patch('/admin/login-settings')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      customOAuthEnabled: true,
      customOAuthProviderId: PROVIDER_ID,
      customOAuthProviderName: 'Test Provider',
      customOAuthClientId: CLIENT_ID,
      customOAuthAuthorizationUrl: 'https://issuer.example.com/authorize',
      customOAuthTokenUrl: 'https://issuer.example.com/token',
      customOAuthUserInfoUrl: 'https://issuer.example.com/userinfo',
      customOAuthIssuer: ISSUER,
      customOAuthJwksUrl: jwksUrl,
    });
  expect(response.status).toBe(200);
};

beforeEach(async () => {
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.loginSettings.deleteMany();
});

describe('POST /auth/oauth/backchannel-logout', () => {
  it('revoga as sessões locais do usuário vinculado ao sub do logout_token', async () => {
    const { adminToken } = await registerAdmin();
    await enableCustomOAuthWithBackchannelLogout(adminToken);
    const { accessToken } = await registerLinkedUser('sub-123');

    const before = await request(app).get('/auth/me').set('Authorization', `Bearer ${accessToken}`);
    expect(before.status).toBe(200);

    const logoutToken = await signLogoutToken({ sub: 'sub-123' });
    const response = await request(app)
      .post('/auth/oauth/backchannel-logout')
      .type('form')
      .send({ logout_token: logoutToken });

    expect(response.status).toBe(200);

    const after = await request(app).get('/auth/me').set('Authorization', `Bearer ${accessToken}`);
    expect(after.status).toBe(401);
  });

  it('não invalida um login novo feito depois do logout_token (sid reciclado não fica banido pra sempre)', async () => {
    const { adminToken } = await registerAdmin();
    await enableCustomOAuthWithBackchannelLogout(adminToken);
    const { accessToken: oldToken, userId } = await registerLinkedUser('sub-456');

    await request(app)
      .post('/auth/oauth/backchannel-logout')
      .type('form')
      .send({ logout_token: await signLogoutToken({ sub: 'sub-456' }) });

    const oldCheck = await request(app).get('/auth/me').set('Authorization', `Bearer ${oldToken}`);
    expect(oldCheck.status).toBe(401);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const freshLogin = await request(app)
      .post('/auth/login')
      .send({ email: user.email, password: 'password123' });
    const newCheck = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${freshLogin.body.accessToken}`);
    expect(newCheck.status).toBe(200);
  });

  it('responde 200 mesmo sem conta local vinculada a esse sub (não é erro do provedor)', async () => {
    const { adminToken } = await registerAdmin();
    await enableCustomOAuthWithBackchannelLogout(adminToken);

    const response = await request(app)
      .post('/auth/oauth/backchannel-logout')
      .type('form')
      .send({ logout_token: await signLogoutToken({ sub: 'sub-desconhecido' }) });

    expect(response.status).toBe(200);
  });

  it('exige o campo logout_token', async () => {
    const response = await request(app).post('/auth/oauth/backchannel-logout').type('form').send({});
    expect(response.status).toBe(400);
  });

  it('rejeita quando nenhum provedor tem issuer/jwks configurado', async () => {
    const response = await request(app)
      .post('/auth/oauth/backchannel-logout')
      .type('form')
      .send({ logout_token: await signLogoutToken({ sub: 'sub-123' }) });

    expect(response.status).toBe(400);
  });

  it('rejeita assinatura de uma chave diferente da configurada', async () => {
    const { adminToken } = await registerAdmin();
    await enableCustomOAuthWithBackchannelLogout(adminToken);

    const { privateKey: otherKey } = await generateKeyPair('ES256');
    const forged = await new SignJWT({ events: { [BACKCHANNEL_LOGOUT_EVENT]: {} }, sub: 'sub-123' })
      .setProtectedHeader({ alg: 'ES256', typ: 'logout+jwt', kid: KID })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(CLIENT_ID)
      .sign(otherKey);

    const response = await request(app)
      .post('/auth/oauth/backchannel-logout')
      .type('form')
      .send({ logout_token: forged });

    expect(response.status).toBe(400);
  });

  it('rejeita issuer diferente do configurado', async () => {
    const { adminToken } = await registerAdmin();
    await enableCustomOAuthWithBackchannelLogout(adminToken);

    const logoutToken = await new SignJWT({ events: { [BACKCHANNEL_LOGOUT_EVENT]: {} }, sub: 'sub-123' })
      .setProtectedHeader({ alg: 'ES256', typ: 'logout+jwt', kid: KID })
      .setIssuedAt()
      .setIssuer('https://outro-issuer.example.com')
      .setAudience(CLIENT_ID)
      .sign(privateKey);

    const response = await request(app)
      .post('/auth/oauth/backchannel-logout')
      .type('form')
      .send({ logout_token: logoutToken });

    expect(response.status).toBe(400);
  });

  it('rejeita audience diferente do client id configurado', async () => {
    const { adminToken } = await registerAdmin();
    await enableCustomOAuthWithBackchannelLogout(adminToken);

    const logoutToken = await new SignJWT({ events: { [BACKCHANNEL_LOGOUT_EVENT]: {} }, sub: 'sub-123' })
      .setProtectedHeader({ alg: 'ES256', typ: 'logout+jwt', kid: KID })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience('outro-client-id')
      .sign(privateKey);

    const response = await request(app)
      .post('/auth/oauth/backchannel-logout')
      .type('form')
      .send({ logout_token: logoutToken });

    expect(response.status).toBe(400);
  });

  it('rejeita "typ" diferente de "logout+jwt" (distingue de um id_token replay-ado)', async () => {
    const { adminToken } = await registerAdmin();
    await enableCustomOAuthWithBackchannelLogout(adminToken);

    const logoutToken = await signLogoutToken({ sub: 'sub-123' }, { typ: 'JWT' });

    const response = await request(app)
      .post('/auth/oauth/backchannel-logout')
      .type('form')
      .send({ logout_token: logoutToken });

    expect(response.status).toBe(400);
  });

  it('rejeita token sem o claim "events" de back-channel logout', async () => {
    const { adminToken } = await registerAdmin();
    await enableCustomOAuthWithBackchannelLogout(adminToken);

    const logoutToken = await new SignJWT({ sub: 'sub-123' })
      .setProtectedHeader({ alg: 'ES256', typ: 'logout+jwt', kid: KID })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(CLIENT_ID)
      .sign(privateKey);

    const response = await request(app)
      .post('/auth/oauth/backchannel-logout')
      .type('form')
      .send({ logout_token: logoutToken });

    expect(response.status).toBe(400);
  });

  it('rejeita token com "nonce" (indica replay de um id_token, não um logout_token genuíno)', async () => {
    const { adminToken } = await registerAdmin();
    await enableCustomOAuthWithBackchannelLogout(adminToken);

    const logoutToken = await signLogoutToken({ sub: 'sub-123', nonce: 'abc' });

    const response = await request(app)
      .post('/auth/oauth/backchannel-logout')
      .type('form')
      .send({ logout_token: logoutToken });

    expect(response.status).toBe(400);
  });
});
