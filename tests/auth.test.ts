import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/infrastructure/database/prisma/client';
import { createApp } from '../src/main/app';

const app = createApp();

const registerUser = async (overrides: Partial<{ name: string; email: string; password: string }> = {}) =>
  request(app)
    .post('/auth/register')
    .send({
      name: 'Rafael Bogos',
      email: 'rafael@example.com',
      password: 'password123',
      ...overrides,
    });

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('POST /auth/register', () => {
  it('registra um usuário com sucesso e retorna tokens', async () => {
    const response = await registerUser();

    expect(response.status).toBe(201);
    expect(response.body.accessToken).toBeTypeOf('string');
    expect(response.body.refreshToken).toBeTypeOf('string');
    expect(response.body.user).toMatchObject({
      name: 'Rafael Bogos',
      email: 'rafael@example.com',
      role: 'CUSTOMER',
    });
  });

  it('rejeita registro com e-mail já em uso', async () => {
    await registerUser();
    const response = await registerUser();

    expect(response.status).toBe(409);
    expect(response.body.error).toBeTypeOf('string');
  });

  it('rejeita dados inválidos', async () => {
    const response = await registerUser({ email: 'not-an-email' });

    expect(response.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  it('faz login com sucesso', async () => {
    await registerUser();

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'rafael@example.com', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeTypeOf('string');
    expect(response.body.refreshToken).toBeTypeOf('string');
  });

  it('rejeita credenciais inválidas', async () => {
    await registerUser();

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'rafael@example.com', password: 'wrong-password' });

    expect(response.status).toBe(401);
  });

  it('rejeita login de usuário inexistente', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(response.status).toBe(401);
  });
});

describe('POST /auth/refresh', () => {
  it('gera novos tokens a partir de um refresh token válido', async () => {
    const registerResponse = await registerUser();
    const { refreshToken } = registerResponse.body;

    const response = await request(app).post('/auth/refresh').send({ refreshToken });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeTypeOf('string');
    expect(response.body.refreshToken).toBeTypeOf('string');
  });

  it('rejeita refresh token inválido', async () => {
    const response = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'token-invalido' });

    expect(response.status).toBe(401);
  });
});

describe('GET /auth/me e requireRole via rota protegida', () => {
  it('retorna o usuário autenticado com um access token válido', async () => {
    const registerResponse = await registerUser();
    const { accessToken } = registerResponse.body;

    const response = await request(app).get('/auth/me').set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ email: 'rafael@example.com', role: 'CUSTOMER' });
  });

  it('rejeita acesso sem token', async () => {
    const response = await request(app).get('/auth/me');
    expect(response.status).toBe(401);
  });

  it('rejeita acesso com token inválido', async () => {
    const response = await request(app).get('/auth/me').set('Authorization', 'Bearer token-invalido');
    expect(response.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('invalida tokens antigos ao incrementar o tokenVersion', async () => {
    const registerResponse = await registerUser();
    const { accessToken } = registerResponse.body;

    const logoutResponse = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(logoutResponse.status).toBe(204);

    const meResponse = await request(app).get('/auth/me').set('Authorization', `Bearer ${accessToken}`);
    expect(meResponse.status).toBe(401);
  });
});

describe('POST /auth/change-password', () => {
  it('troca a senha, devolve tokens novos e invalida o token antigo', async () => {
    const registerResponse = await registerUser();
    const { accessToken: oldAccessToken } = registerResponse.body;

    const changeResponse = await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${oldAccessToken}`)
      .send({ currentPassword: 'password123', newPassword: 'new-password456' });

    expect(changeResponse.status).toBe(200);
    expect(changeResponse.body.accessToken).toBeTypeOf('string');
    expect(changeResponse.body.refreshToken).toBeTypeOf('string');

    const oldTokenMeResponse = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${oldAccessToken}`);
    expect(oldTokenMeResponse.status).toBe(401);

    const newTokenMeResponse = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${changeResponse.body.accessToken}`);
    expect(newTokenMeResponse.status).toBe(200);

    const oldPasswordLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'rafael@example.com', password: 'password123' });
    expect(oldPasswordLogin.status).toBe(401);

    const newPasswordLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'rafael@example.com', password: 'new-password456' });
    expect(newPasswordLogin.status).toBe(200);
  });

  it('rejeita quando a senha atual está errada', async () => {
    const registerResponse = await registerUser();
    const { accessToken } = registerResponse.body;

    const response = await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'senha-errada', newPassword: 'new-password456' });

    expect(response.status).toBe(401);
  });

  it('rejeita sem token', async () => {
    const response = await request(app)
      .post('/auth/change-password')
      .send({ currentPassword: 'password123', newPassword: 'new-password456' });

    expect(response.status).toBe(401);
  });
});
