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
