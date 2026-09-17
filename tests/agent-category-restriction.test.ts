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

const createTicket = async (
  accessToken: string,
  overrides: Partial<{ title: string; description: string; categoryId: string | null }> = {},
) =>
  request(app)
    .post('/tickets')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ title: 'Chamado de teste', description: 'descrição', ...overrides });

const cleanDb = async () => {
  await prisma.agentCategory.deleteMany();
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

describe('Restrição de categoria por atendente', () => {
  it('agent restrito a uma categoria só vê chamados sem responsável dessa categoria na fila', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const admin = await registerAndLogin('ADMIN');
    const restrictedAgent = await registerAndLogin('AGENT');
    const freeAgent = await registerAndLogin('AGENT');

    const categoryA = await prisma.category.create({ data: { name: 'Categoria A' } });
    const categoryB = await prisma.category.create({ data: { name: 'Categoria B' } });

    const ticketA = await createTicket(customer.accessToken, { categoryId: categoryA.id });
    const ticketB = await createTicket(customer.accessToken, { categoryId: categoryB.id });
    const ticketNone = await createTicket(customer.accessToken);

    const restrictResponse = await request(app)
      .patch(`/admin/users/${restrictedAgent.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ categoryIds: [categoryA.id] });

    expect(restrictResponse.status).toBe(200);
    expect(restrictResponse.body.categoryIds).toEqual([categoryA.id]);

    const restrictedQueue = await request(app)
      .get('/tickets')
      .set('Authorization', `Bearer ${restrictedAgent.accessToken}`);
    const restrictedIds = restrictedQueue.body.items.map((t: { id: string }) => t.id);
    expect(restrictedIds).toContain(ticketA.body.id);
    expect(restrictedIds).not.toContain(ticketB.body.id);
    expect(restrictedIds).not.toContain(ticketNone.body.id);

    const freeQueue = await request(app).get('/tickets').set('Authorization', `Bearer ${freeAgent.accessToken}`);
    const freeIds = freeQueue.body.items.map((t: { id: string }) => t.id);
    expect(freeIds).toEqual(
      expect.arrayContaining([ticketA.body.id, ticketB.body.id, ticketNone.body.id]),
    );
  });

  it('agent restrito recebe 404 ao tentar ver o detalhe de um chamado fora da categoria permitida', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const admin = await registerAndLogin('ADMIN');
    const restrictedAgent = await registerAndLogin('AGENT');

    const categoryA = await prisma.category.create({ data: { name: 'Categoria A' } });
    const categoryB = await prisma.category.create({ data: { name: 'Categoria B' } });

    const ticketA = await createTicket(customer.accessToken, { categoryId: categoryA.id });
    const ticketB = await createTicket(customer.accessToken, { categoryId: categoryB.id });

    await request(app)
      .patch(`/admin/users/${restrictedAgent.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ categoryIds: [categoryA.id] });

    const seesA = await request(app)
      .get(`/tickets/${ticketA.body.number}`)
      .set('Authorization', `Bearer ${restrictedAgent.accessToken}`);
    expect(seesA.status).toBe(200);

    const seesB = await request(app)
      .get(`/tickets/${ticketB.body.number}`)
      .set('Authorization', `Bearer ${restrictedAgent.accessToken}`);
    expect(seesB.status).toBe(404);
  });

  it('admin atribuir manualmente um agent restrito a um chamado fora da categoria dele funciona, e depois ele passa a ver esse chamado', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const admin = await registerAndLogin('ADMIN');
    const restrictedAgent = await registerAndLogin('AGENT');

    const categoryA = await prisma.category.create({ data: { name: 'Categoria A' } });
    const categoryB = await prisma.category.create({ data: { name: 'Categoria B' } });

    const ticketB = await createTicket(customer.accessToken, { categoryId: categoryB.id });

    await request(app)
      .patch(`/admin/users/${restrictedAgent.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ categoryIds: [categoryA.id] });

    // Antes de ser atribuído, o agent restrito não vê o chamado de categoria B.
    const before = await request(app)
      .get(`/tickets/${ticketB.body.number}`)
      .set('Authorization', `Bearer ${restrictedAgent.accessToken}`);
    expect(before.status).toBe(404);

    // Admin atribui manualmente mesmo assim — não é bloqueado.
    const assignResponse = await request(app)
      .patch(`/tickets/${ticketB.body.number}/assign`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ assigneeIds: [restrictedAgent.userId] });
    expect(assignResponse.status).toBe(200);

    // Agora que está atribuído, ele enxerga independente da categoria.
    const after = await request(app)
      .get(`/tickets/${ticketB.body.number}`)
      .set('Authorization', `Bearer ${restrictedAgent.accessToken}`);
    expect(after.status).toBe(200);
  });

  it('agent sem nenhuma categoria cadastrada continua sem restrição (retrocompatível)', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const agent = await registerAndLogin('AGENT');
    const category = await prisma.category.create({ data: { name: 'Categoria qualquer' } });

    const ticket = await createTicket(customer.accessToken, { categoryId: category.id });
    const ticketNoCategory = await createTicket(customer.accessToken);

    const queue = await request(app).get('/tickets').set('Authorization', `Bearer ${agent.accessToken}`);
    const ids = queue.body.items.map((t: { id: string }) => t.id);
    expect(ids).toEqual(expect.arrayContaining([ticket.body.id, ticketNoCategory.body.id]));
  });

  it('GET /admin/users lista as categorias permitidas de cada usuário', async () => {
    const admin = await registerAndLogin('ADMIN');
    const restrictedAgent = await registerAndLogin('AGENT');
    const category = await prisma.category.create({ data: { name: 'Categoria X' } });

    await request(app)
      .patch(`/admin/users/${restrictedAgent.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ categoryIds: [category.id] });

    const listResponse = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(listResponse.status).toBe(200);
    const found = listResponse.body.items.find((u: { id: string }) => u.id === restrictedAgent.userId);
    expect(found.categoryIds).toEqual([category.id]);
  });

  it('remover todas as categorias (categoryIds: []) devolve a restrição pra "sem restrição"', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const admin = await registerAndLogin('ADMIN');
    const restrictedAgent = await registerAndLogin('AGENT');

    const categoryA = await prisma.category.create({ data: { name: 'Categoria A' } });
    const categoryB = await prisma.category.create({ data: { name: 'Categoria B' } });
    const ticketB = await createTicket(customer.accessToken, { categoryId: categoryB.id });

    await request(app)
      .patch(`/admin/users/${restrictedAgent.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ categoryIds: [categoryA.id] });

    const removeResponse = await request(app)
      .patch(`/admin/users/${restrictedAgent.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ categoryIds: [] });
    expect(removeResponse.status).toBe(200);
    expect(removeResponse.body.categoryIds).toEqual([]);

    const queue = await request(app)
      .get('/tickets')
      .set('Authorization', `Bearer ${restrictedAgent.accessToken}`);
    const ids = queue.body.items.map((t: { id: string }) => t.id);
    expect(ids).toContain(ticketB.body.id);
  });
});
