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
  await prisma.slaSettings.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.slaSettings.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('GET /admin/sla-settings', () => {
  it('exige autenticação', async () => {
    const response = await request(app).get('/admin/sla-settings');
    expect(response.status).toBe(401);
  });

  it('bloqueia quem não é admin', async () => {
    const agent = await registerAndLogin('AGENT');
    const response = await request(app)
      .get('/admin/sla-settings')
      .set('Authorization', `Bearer ${agent.accessToken}`);
    expect(response.status).toBe(403);
  });

  it('admin vê os defaults antes de qualquer configuração', async () => {
    const admin = await registerAndLogin('ADMIN');
    const response = await request(app)
      .get('/admin/sla-settings')
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      lowPriorityHours: 72,
      mediumPriorityHours: 24,
      highPriorityHours: 8,
      urgentPriorityHours: 4,
      warningThresholdPercent: 80,
    });
  });
});

describe('PATCH /admin/sla-settings', () => {
  it('exige autenticação', async () => {
    const response = await request(app).patch('/admin/sla-settings').send({ urgentPriorityHours: 2 });
    expect(response.status).toBe(401);
  });

  it('bloqueia quem não é admin', async () => {
    const agent = await registerAndLogin('AGENT');
    const response = await request(app)
      .patch('/admin/sla-settings')
      .set('Authorization', `Bearer ${agent.accessToken}`)
      .send({ urgentPriorityHours: 2 });
    expect(response.status).toBe(403);
  });

  it('atualiza só o campo enviado, preservando os demais (partial update)', async () => {
    const admin = await registerAndLogin('ADMIN');

    const response = await request(app)
      .patch('/admin/sla-settings')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ urgentPriorityHours: 2 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      lowPriorityHours: 72,
      mediumPriorityHours: 24,
      highPriorityHours: 8,
      urgentPriorityHours: 2,
      warningThresholdPercent: 80,
    });
  });

  it('rejeita corpo vazio', async () => {
    const admin = await registerAndLogin('ADMIN');
    const response = await request(app)
      .patch('/admin/sla-settings')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({});
    expect(response.status).toBe(400);
  });

  it('rejeita prazo zero ou negativo', async () => {
    const admin = await registerAndLogin('ADMIN');
    const response = await request(app)
      .patch('/admin/sla-settings')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ lowPriorityHours: 0 });
    expect(response.status).toBe(400);
  });

  it('rejeita limiar de aviso fora de 1-99', async () => {
    const admin = await registerAndLogin('ADMIN');
    const response = await request(app)
      .patch('/admin/sla-settings')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ warningThresholdPercent: 100 });
    expect(response.status).toBe(400);
  });
});
