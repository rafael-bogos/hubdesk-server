import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/infrastructure/database/prisma/client';
import { createApp } from '../src/main/app';

const app = createApp();

let userCounter = 0;

const registerAndLogin = async (
  role: 'CUSTOMER' | 'AGENT' | 'ADMIN' = 'CUSTOMER',
): Promise<{ userId: string; email: string; password: string; accessToken: string }> => {
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

  return { userId, email, password, accessToken: loginResponse.body.accessToken };
};

const cleanDb = async () => {
  await prisma.auditLog.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.ticketAssignee.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
};

beforeEach(cleanDb);

afterAll(async () => {
  await cleanDb();
  await prisma.$disconnect();
});

describe('GET /users/agents', () => {
  it('agent consegue listar agentes/admins ativos', async () => {
    const agent = await registerAndLogin('AGENT');
    const admin = await registerAndLogin('ADMIN');
    await registerAndLogin('CUSTOMER');

    const response = await request(app).get('/users/agents').set('Authorization', `Bearer ${agent.accessToken}`);

    expect(response.status).toBe(200);
    const ids = response.body.map((user: { id: string }) => user.id);
    expect(ids).toEqual(expect.arrayContaining([agent.userId, admin.userId]));
    expect(ids).not.toContain(undefined);
    expect(response.body.every((user: Record<string, unknown>) => !('passwordHash' in user))).toBe(true);
  });

  it('admin também consegue listar', async () => {
    const admin = await registerAndLogin('ADMIN');

    const response = await request(app).get('/users/agents').set('Authorization', `Bearer ${admin.accessToken}`);

    expect(response.status).toBe(200);
  });

  it('customer recebe 403', async () => {
    const customer = await registerAndLogin('CUSTOMER');

    const response = await request(app).get('/users/agents').set('Authorization', `Bearer ${customer.accessToken}`);

    expect(response.status).toBe(403);
  });

  it('requisição sem token recebe 401', async () => {
    const response = await request(app).get('/users/agents');

    expect(response.status).toBe(401);
  });
});

describe('PATCH /users/me/notification-preferences', () => {
  it('atualiza só a preferência de atualização de ticket, mantendo a de fechamento', async () => {
    const user = await registerAndLogin();

    const response = await request(app)
      .patch('/users/me/notification-preferences')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ emailOnTicketUpdated: false });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      emailOnTicketUpdated: false,
      emailOnTicketClosed: true,
      emailOnSlaWarning: true,
    });

    const meResponse = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${user.accessToken}`);
    expect(meResponse.body.emailOnTicketUpdated).toBe(false);
    expect(meResponse.body.emailOnTicketClosed).toBe(true);
  });

  it('atualiza só a preferência de fechamento, mantendo as demais', async () => {
    const user = await registerAndLogin();

    const response = await request(app)
      .patch('/users/me/notification-preferences')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ emailOnTicketClosed: false });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      emailOnTicketUpdated: true,
      emailOnTicketClosed: false,
      emailOnSlaWarning: true,
    });
  });

  it('atualiza só a preferência de aviso de SLA, mantendo as demais', async () => {
    const user = await registerAndLogin();

    const response = await request(app)
      .patch('/users/me/notification-preferences')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ emailOnSlaWarning: false });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      emailOnTicketUpdated: true,
      emailOnTicketClosed: true,
      emailOnSlaWarning: false,
    });
  });

  it('rejeita payload inválido', async () => {
    const user = await registerAndLogin();

    const response = await request(app)
      .patch('/users/me/notification-preferences')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ emailOnTicketUpdated: 'yes' });

    expect(response.status).toBe(400);
  });

  it('rejeita payload vazio', async () => {
    const user = await registerAndLogin();

    const response = await request(app)
      .patch('/users/me/notification-preferences')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({});

    expect(response.status).toBe(400);
  });

  it('requisição sem token recebe 401', async () => {
    const response = await request(app)
      .patch('/users/me/notification-preferences')
      .send({ emailOnTicketUpdated: false });

    expect(response.status).toBe(401);
  });
});

describe('Foto de perfil', () => {
  // PNG 1x1 válido — só precisa passar pelo fileFilter (mimetype) e ser
  // gravável/legível de volta pelo FileStorage, o conteúdo em si não importa.
  const tinyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );

  it('upload substitui o avatarUrl em /auth/me e fica servido publicamente em GET /users/:id/avatar', async () => {
    const user = await registerAndLogin();

    const meBefore = await request(app).get('/auth/me').set('Authorization', `Bearer ${user.accessToken}`);
    expect(meBefore.body.avatarUrl).toBeNull();

    const uploadResponse = await request(app)
      .post('/users/me/avatar')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .attach('file', tinyPng, { filename: 'avatar.png', contentType: 'image/png' });

    expect(uploadResponse.status).toBe(200);
    expect(uploadResponse.body.avatarUrl).toContain(`/users/${user.userId}/avatar`);

    const meAfter = await request(app).get('/auth/me').set('Authorization', `Bearer ${user.accessToken}`);
    expect(meAfter.body.avatarUrl).toBe(uploadResponse.body.avatarUrl);

    const publicResponse = await request(app).get(`/users/${user.userId}/avatar`);
    expect(publicResponse.status).toBe(200);
    expect(publicResponse.headers['content-type']).toBe('image/png');
    expect(publicResponse.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(Buffer.compare(publicResponse.body, tinyPng)).toBe(0);
  });

  it('rejeita formato de imagem não suportado', async () => {
    const user = await registerAndLogin();

    const response = await request(app)
      .post('/users/me/avatar')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .attach('file', Buffer.from('<svg></svg>'), { filename: 'avatar.svg', contentType: 'image/svg+xml' });

    expect(response.status).toBe(400);
  });

  it('DELETE remove o avatar próprio e volta a 404 em GET /users/:id/avatar', async () => {
    const user = await registerAndLogin();

    await request(app)
      .post('/users/me/avatar')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .attach('file', tinyPng, { filename: 'avatar.png', contentType: 'image/png' });

    const deleteResponse = await request(app)
      .delete('/users/me/avatar')
      .set('Authorization', `Bearer ${user.accessToken}`);
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.avatarUrl).toBeNull();

    const meAfter = await request(app).get('/auth/me').set('Authorization', `Bearer ${user.accessToken}`);
    expect(meAfter.body.avatarUrl).toBeNull();

    const publicResponse = await request(app).get(`/users/${user.userId}/avatar`);
    expect(publicResponse.status).toBe(404);
  });

  it('sem foto própria, cai pra foto já existente na conta do provedor OAuth (campo `image`)', async () => {
    const user = await registerAndLogin();
    const providerImageUrl = 'https://lh3.googleusercontent.com/a/fake-photo.jpg';
    await prisma.user.update({ where: { id: user.userId }, data: { image: providerImageUrl } });

    const meResponse = await request(app).get('/auth/me').set('Authorization', `Bearer ${user.accessToken}`);
    expect(meResponse.body.avatarUrl).toBe(providerImageUrl);
  });

  it('foto própria enviada tem prioridade sobre a foto do provedor OAuth', async () => {
    const user = await registerAndLogin();
    await prisma.user.update({
      where: { id: user.userId },
      data: { image: 'https://lh3.googleusercontent.com/a/fake-photo.jpg' },
    });

    const uploadResponse = await request(app)
      .post('/users/me/avatar')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .attach('file', tinyPng, { filename: 'avatar.png', contentType: 'image/png' });

    expect(uploadResponse.body.avatarUrl).toContain(`/users/${user.userId}/avatar`);
  });

  it('remover a foto própria também limpa a foto do provedor OAuth (não volta a aparecer)', async () => {
    const user = await registerAndLogin();
    await prisma.user.update({
      where: { id: user.userId },
      data: { image: 'https://lh3.googleusercontent.com/a/fake-photo.jpg' },
    });

    await request(app)
      .post('/users/me/avatar')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .attach('file', tinyPng, { filename: 'avatar.png', contentType: 'image/png' });

    await request(app).delete('/users/me/avatar').set('Authorization', `Bearer ${user.accessToken}`);

    const meAfter = await request(app).get('/auth/me').set('Authorization', `Bearer ${user.accessToken}`);
    expect(meAfter.body.avatarUrl).toBeNull();
  });

  it('requisição sem token recebe 401 no upload e no delete', async () => {
    const uploadResponse = await request(app)
      .post('/users/me/avatar')
      .attach('file', tinyPng, { filename: 'avatar.png', contentType: 'image/png' });
    expect(uploadResponse.status).toBe(401);

    const deleteResponse = await request(app).delete('/users/me/avatar');
    expect(deleteResponse.status).toBe(401);
  });
});
