import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/infrastructure/database/prisma/client';
import { createRedisConnection } from '../src/infrastructure/queue/redis-connection';
import { createApp } from '../src/main/app';

const app = createApp();
const redis = createRedisConnection();

const handoffKey = (code: string) => `oauth-handoff:${code}`;

let userCounter = 0;

const registerUser = async (): Promise<{ userId: string }> => {
  userCounter += 1;
  const email = `oauth-user${userCounter}@example.com`;
  const response = await request(app)
    .post('/auth/register')
    .send({ name: `OAuth User ${userCounter}`, email, password: 'password123' });
  return { userId: response.body.user.id };
};

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await redis.quit();
  await prisma.$disconnect();
});

describe('POST /auth/oauth/exchange', () => {
  it('troca um código válido pelo par de JWT do usuário', async () => {
    const { userId } = await registerUser();
    const code = randomBytes(24).toString('base64url');
    await redis.set(handoffKey(code), userId, 'EX', 60);

    const response = await request(app).post('/auth/oauth/exchange').send({ code });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
    expect(response.body.user.id).toBe(userId);

    // O JWT emitido precisa ser aceito normalmente pelo authenticate
    // middleware de sempre, numa chamada real.
    const me = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${response.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.id).toBe(userId);
  });

  it('código é de uso único', async () => {
    const { userId } = await registerUser();
    const code = randomBytes(24).toString('base64url');
    await redis.set(handoffKey(code), userId, 'EX', 60);

    const first = await request(app).post('/auth/oauth/exchange').send({ code });
    expect(first.status).toBe(200);

    const second = await request(app).post('/auth/oauth/exchange').send({ code });
    expect(second.status).toBe(401);
  });

  it('rejeita código inexistente/expirado', async () => {
    const response = await request(app).post('/auth/oauth/exchange').send({ code: 'nunca-existiu' });
    expect(response.status).toBe(401);
  });

  it('exige o campo code', async () => {
    const response = await request(app).post('/auth/oauth/exchange').send({});
    expect(response.status).toBe(400);
  });
});

describe('GET /auth/oauth/start', () => {
  afterAll(async () => {
    await prisma.loginSettings.deleteMany();
  });

  it('exige o parâmetro provider', async () => {
    const response = await request(app).get('/auth/oauth/start');
    expect(response.status).toBe(400);
  });

  it('redireciona pro provedor E grava o cookie de state — sem isso o callback do Google dá "state_mismatch"', async () => {
    const email = 'admin-oauth-start@example.com';
    await request(app)
      .post('/auth/register')
      .send({ name: 'Admin OAuth', email, password: 'password123' });
    const adminId = (await request(app).post('/auth/login').send({ email, password: 'password123' })).body.user.id;
    await prisma.user.update({ where: { id: adminId }, data: { role: 'ADMIN' } });
    const adminToken = (await request(app).post('/auth/login').send({ email, password: 'password123' })).body
      .accessToken;

    await request(app)
      .patch('/admin/login-settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ googleEnabled: true, googleClientId: 'fake-client-id', googleClientSecret: 'fake-secret' });

    const response = await request(app).get('/auth/oauth/start?provider=google');

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain('accounts.google.com');
    expect(response.headers['set-cookie']?.length).toBeGreaterThan(0);
  });
});
