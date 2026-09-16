import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/infrastructure/database/prisma/client';
import { createApp } from '../src/main/app';

const app = createApp();

let userCounter = 0;

const registerAndLogin = async (
  role: 'CUSTOMER' | 'AGENT' | 'ADMIN' = 'CUSTOMER',
): Promise<{ userId: string; accessToken: string }> => {
  userCounter += 1;
  const email = `user${userCounter}@example.com`;
  const password = 'password123';

  const registerResponse = await request(app)
    .post('/auth/register')
    .send({ name: `User ${userCounter}`, email, password });

  const userId: string = registerResponse.body.user.id;

  if (role !== 'CUSTOMER') {
    await prisma.user.update({ where: { id: userId }, data: { role } });
  }

  const loginResponse = await request(app).post('/auth/login').send({ email, password });

  return { userId, accessToken: loginResponse.body.accessToken };
};

beforeEach(async () => {
  await prisma.loginSettings.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.loginSettings.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('GET /auth/login-methods', () => {
  it('é público e reflete os defaults antes de qualquer configuração', async () => {
    const response = await request(app).get('/auth/login-methods');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      emailPasswordEnabled: true,
      googleEnabled: false,
      customOAuthEnabled: false,
      customOAuthProviderId: null,
      customOAuthProviderName: null,
      customOAuthLogoUrl: null,
      defaultMethod: 'google',
    });
  });
});

describe('GET /admin/login-settings', () => {
  it('exige autenticação', async () => {
    const response = await request(app).get('/admin/login-settings');
    expect(response.status).toBe(401);
  });

  it('bloqueia quem não é admin', async () => {
    const agent = await registerAndLogin('AGENT');
    const response = await request(app)
      .get('/admin/login-settings')
      .set('Authorization', `Bearer ${agent.accessToken}`);
    expect(response.status).toBe(403);
  });

  it('admin vê os defaults, sem secrets, com as callback URLs calculadas', async () => {
    const admin = await registerAndLogin('ADMIN');
    const response = await request(app)
      .get('/admin/login-settings')
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      emailPasswordEnabled: true,
      googleEnabled: false,
      googleClientId: null,
      googleClientSecretSet: false,
      customOAuthEnabled: false,
      customOAuthCallbackUrl: null,
      defaultMethod: 'google',
    });
    expect(response.body.googleCallbackUrl).toContain('/better-auth/callback/google');
  });
});

describe('PATCH /admin/login-settings', () => {
  it('bloqueia quem não é admin', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const response = await request(app)
      .patch('/admin/login-settings')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ googleEnabled: true });
    expect(response.status).toBe(403);
  });

  it('não deixa desligar todos os métodos de login ao mesmo tempo', async () => {
    const admin = await registerAndLogin('ADMIN');
    const response = await request(app)
      .patch('/admin/login-settings')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ emailPasswordEnabled: false });

    expect(response.status).toBe(400);
  });

  it('não deixa habilitar o Google sem client id/secret', async () => {
    const admin = await registerAndLogin('ADMIN');
    const response = await request(app)
      .patch('/admin/login-settings')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ googleEnabled: true });

    expect(response.status).toBe(400);
  });

  it('habilita o Google com credenciais completas e nunca devolve o secret em texto puro', async () => {
    const admin = await registerAndLogin('ADMIN');
    const response = await request(app)
      .patch('/admin/login-settings')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ googleEnabled: true, googleClientId: 'client-123', googleClientSecret: 'super-secret-value' });

    expect(response.status).toBe(200);
    expect(response.body.googleEnabled).toBe(true);
    expect(response.body.googleClientId).toBe('client-123');
    expect(response.body.googleClientSecretSet).toBe(true);
    expect(JSON.stringify(response.body)).not.toContain('super-secret-value');

    const publicMethods = await request(app).get('/auth/login-methods');
    expect(publicMethods.body.googleEnabled).toBe(true);

    const row = await prisma.loginSettings.findUniqueOrThrow({ where: { id: 'singleton' } });
    expect(row.googleClientSecretEncrypted).not.toBeNull();
    expect(row.googleClientSecretEncrypted).not.toContain('super-secret-value');
  });

  it('reenviar só o client id sem secret mantém o secret já salvo', async () => {
    const admin = await registerAndLogin('ADMIN');
    await request(app)
      .patch('/admin/login-settings')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ googleEnabled: true, googleClientId: 'client-123', googleClientSecret: 'super-secret-value' });

    const response = await request(app)
      .patch('/admin/login-settings')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ googleClientId: 'client-456' });

    expect(response.status).toBe(200);
    expect(response.body.googleClientId).toBe('client-456');
    expect(response.body.googleClientSecretSet).toBe(true);
  });

  it('não deixa habilitar o OAuth customizado sem preencher tudo', async () => {
    const admin = await registerAndLogin('ADMIN');
    const response = await request(app)
      .patch('/admin/login-settings')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ customOAuthEnabled: true, customOAuthProviderId: 'meu-idp' });

    expect(response.status).toBe(400);
  });

  it('habilita o OAuth customizado com tudo preenchido', async () => {
    const admin = await registerAndLogin('ADMIN');
    const response = await request(app)
      .patch('/admin/login-settings')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        customOAuthEnabled: true,
        customOAuthProviderId: 'meu-idp',
        customOAuthProviderName: 'Meu IdP',
        customOAuthClientId: 'client-abc',
        customOAuthClientSecret: 'custom-secret-value',
        customOAuthAuthorizationUrl: 'https://idp.example.com/authorize',
        customOAuthTokenUrl: 'https://idp.example.com/token',
        customOAuthUserInfoUrl: 'https://idp.example.com/userinfo',
        defaultMethod: 'custom',
      });

    expect(response.status).toBe(200);
    expect(response.body.customOAuthEnabled).toBe(true);
    expect(response.body.customOAuthProviderName).toBe('Meu IdP');
    expect(response.body.customOAuthCallbackUrl).toContain('/better-auth/callback/meu-idp');
    expect(response.body.defaultMethod).toBe('custom');
    expect(JSON.stringify(response.body)).not.toContain('custom-secret-value');

    const publicMethods = await request(app).get('/auth/login-methods');
    expect(publicMethods.body).toMatchObject({
      customOAuthEnabled: true,
      customOAuthProviderName: 'Meu IdP',
      defaultMethod: 'custom',
    });
  });

  it('habilita o OAuth customizado sem client secret (provedor público, PKCE-only, ex: Comhub ID)', async () => {
    const admin = await registerAndLogin('ADMIN');
    const response = await request(app)
      .patch('/admin/login-settings')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        customOAuthEnabled: true,
        customOAuthProviderId: 'comhub',
        customOAuthProviderName: 'Comhub',
        customOAuthClientId: 'client-publico-sem-secret',
        customOAuthAuthorizationUrl: 'https://id.comhub.com.br/oauth/authorize',
        customOAuthTokenUrl: 'https://id.comhub.com.br/oauth/token',
        customOAuthUserInfoUrl: 'https://id.comhub.com.br/oauth/userinfo',
      });

    expect(response.status).toBe(200);
    expect(response.body.customOAuthEnabled).toBe(true);
    expect(response.body.customOAuthClientSecretSet).toBe(false);

    // A instância do better-auth precisa reconstruir sem travar mesmo sem
    // secret nenhum salvo — o que estava quebrado antes desse fix.
    const startResponse = await request(app).get('/auth/oauth/start?provider=comhub');
    expect(startResponse.status).toBe(302);
    expect(startResponse.headers.location).toContain('id.comhub.com.br/oauth/authorize');
  });

  it('rejeita providerId customizado fora do formato esperado', async () => {
    const admin = await registerAndLogin('ADMIN');
    const response = await request(app)
      .patch('/admin/login-settings')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ customOAuthProviderId: 'Não Pode Isso!' });

    expect(response.status).toBe(400);
  });
});

describe('logo do OAuth customizado', () => {
  it('bloqueia upload de quem não é admin', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const response = await request(app)
      .post('/admin/login-settings/logo')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .attach('file', Buffer.from('conteudo-fake-png'), { filename: 'logo.png', contentType: 'image/png' });

    expect(response.status).toBe(403);
  });

  it('rejeita tipo de arquivo não suportado', async () => {
    const admin = await registerAndLogin('ADMIN');
    const response = await request(app)
      .post('/admin/login-settings/logo')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .attach('file', Buffer.from('nao e imagem'), { filename: 'logo.txt', contentType: 'text/plain' });

    expect(response.status).toBe(400);
  });

  it('nenhuma logo configurada -> GET /auth/login-logo devolve 404', async () => {
    const response = await request(app).get('/auth/login-logo');
    expect(response.status).toBe(404);
  });

  it('admin envia uma logo, ela aparece nas settings e é servida publicamente', async () => {
    const admin = await registerAndLogin('ADMIN');
    const pngContent = Buffer.from('conteudo-fake-png');

    const uploadResponse = await request(app)
      .post('/admin/login-settings/logo')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .attach('file', pngContent, { filename: 'logo.png', contentType: 'image/png' });

    expect(uploadResponse.status).toBe(200);
    expect(uploadResponse.body.customOAuthLogoUrl).toContain('/auth/login-logo');

    const logoResponse = await request(app).get('/auth/login-logo').buffer(true).parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(logoResponse.status).toBe(200);
    expect(logoResponse.headers['content-type']).toBe('image/png');
    expect(Buffer.compare(logoResponse.body as Buffer, pngContent)).toBe(0);

    const publicMethods = await request(app).get('/auth/login-methods');
    expect(publicMethods.body.customOAuthLogoUrl).toContain('/auth/login-logo');
  });

  it('admin remove a logo enviada', async () => {
    const admin = await registerAndLogin('ADMIN');
    await request(app)
      .post('/admin/login-settings/logo')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .attach('file', Buffer.from('conteudo-fake-png'), { filename: 'logo.png', contentType: 'image/png' });

    const deleteResponse = await request(app)
      .delete('/admin/login-settings/logo')
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.customOAuthLogoUrl).toBeNull();

    const logoResponse = await request(app).get('/auth/login-logo');
    expect(logoResponse.status).toBe(404);
  });
});
