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
  await prisma.ticket.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
};

beforeEach(cleanDb);

afterAll(async () => {
  await cleanDb();
  await prisma.$disconnect();
});

describe('GET /categories', () => {
  it('customer consegue listar categorias ativas', async () => {
    const active = await prisma.category.create({ data: { name: 'Financeiro', active: true } });
    await prisma.category.create({ data: { name: 'Arquivada', active: false } });
    const customer = await registerAndLogin('CUSTOMER');

    const response = await request(app)
      .get('/categories')
      .set('Authorization', `Bearer ${customer.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: active.id, name: 'Financeiro' }]);
  });

  it('agent e admin também conseguem listar', async () => {
    await prisma.category.create({ data: { name: 'TI', active: true } });
    const agent = await registerAndLogin('AGENT');
    const admin = await registerAndLogin('ADMIN');

    const agentResponse = await request(app)
      .get('/categories')
      .set('Authorization', `Bearer ${agent.accessToken}`);
    const adminResponse = await request(app)
      .get('/categories')
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(agentResponse.status).toBe(200);
    expect(adminResponse.status).toBe(200);
  });

  it('requisição sem token recebe 401', async () => {
    const response = await request(app).get('/categories');

    expect(response.status).toBe(401);
  });
});

describe('ticket com categoria', () => {
  it('inclui o resumo da categoria na listagem e no detalhe', async () => {
    const category = await prisma.category.create({ data: { name: 'Suporte', active: true } });
    const customer = await registerAndLogin('CUSTOMER');

    const createResponse = await request(app)
      .post('/tickets')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ title: 'Chamado com categoria', description: 'desc', priority: 'LOW', categoryId: category.id });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.categoryId).toBe(category.id);
    const ticketId = createResponse.body.id;

    const listResponse = await request(app)
      .get('/tickets')
      .set('Authorization', `Bearer ${customer.accessToken}`);
    expect(listResponse.body.items[0].category).toEqual({ id: category.id, name: 'Suporte' });

    const detailResponse = await request(app)
      .get(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${customer.accessToken}`);
    expect(detailResponse.body.ticket.category).toEqual({ id: category.id, name: 'Suporte' });
  });

  it('chamado sem categoria retorna category null na listagem e no detalhe', async () => {
    const customer = await registerAndLogin('CUSTOMER');

    const createResponse = await request(app)
      .post('/tickets')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ title: 'Chamado sem categoria', description: 'desc', priority: 'LOW' });
    const ticketId = createResponse.body.id;

    const detailResponse = await request(app)
      .get(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${customer.accessToken}`);

    expect(detailResponse.body.ticket.category).toBeNull();
  });
});
