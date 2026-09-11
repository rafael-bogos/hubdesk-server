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

const createTicket = async (accessToken: string, overrides: Partial<{ title: string; description: string }> = {}) =>
  request(app)
    .post('/tickets')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ title: 'Impressora não liga', description: 'A impressora do 3º andar não liga.', ...overrides });

beforeEach(async () => {
  await prisma.notification.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.ticketAssignee.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.notification.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.ticketAssignee.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('GET /notifications', () => {
  it('lista as notificações do próprio usuário com contador de não lidas', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const agent = await registerAndLogin('AGENT');

    await createTicket(customer.accessToken, { title: 'Chamado A' });
    await createTicket(customer.accessToken, { title: 'Chamado B' });

    const response = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${agent.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
    expect(response.body.unreadCount).toBe(2);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[0]).toMatchObject({ type: 'TICKET_CREATED', read: false });
    // Mais recente primeiro: o chamado B foi criado depois do A.
    expect(response.body.items[0].body).toBe('Chamado B');
    expect(response.body.items[1].body).toBe('Chamado A');
  });

  it('não retorna notificação de outro usuário', async () => {
    const customerA = await registerAndLogin('CUSTOMER');
    const customerB = await registerAndLogin('CUSTOMER');
    const agent = await registerAndLogin('AGENT');

    await createTicket(customerA.accessToken);

    const responseB = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${customerB.accessToken}`);

    expect(responseB.status).toBe(200);
    expect(responseB.body.total).toBe(0);

    const responseAgent = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${agent.accessToken}`);

    expect(responseAgent.body.total).toBe(1);
  });

  it('exige autenticação', async () => {
    const response = await request(app).get('/notifications');
    expect(response.status).toBe(401);
  });
});

describe('PATCH /notifications/:id/read', () => {
  it('marca a própria notificação como lida', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const agent = await registerAndLogin('AGENT');

    await createTicket(customer.accessToken);

    const listResponse = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${agent.accessToken}`);
    const notificationId = listResponse.body.items[0].id;

    const response = await request(app)
      .patch(`/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${agent.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.read).toBe(true);

    const listAfter = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${agent.accessToken}`);
    expect(listAfter.body.unreadCount).toBe(0);
  });

  it('não deixa marcar como lida uma notificação de outra pessoa', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const agentA = await registerAndLogin('AGENT');
    const agentB = await registerAndLogin('AGENT');

    await createTicket(customer.accessToken);

    const listResponse = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${agentA.accessToken}`);
    const notificationId = listResponse.body.items[0].id;

    const response = await request(app)
      .patch(`/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${agentB.accessToken}`);

    expect(response.status).toBe(404);
  });

  it('retorna 404 para notificação inexistente', async () => {
    const agent = await registerAndLogin('AGENT');

    const response = await request(app)
      .patch('/notifications/inexistente/read')
      .set('Authorization', `Bearer ${agent.accessToken}`);

    expect(response.status).toBe(404);
  });
});

describe('PATCH /notifications/read-all', () => {
  it('marca todas as notificações do usuário como lidas', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const agent = await registerAndLogin('AGENT');

    await createTicket(customer.accessToken, { title: 'Chamado A' });
    await createTicket(customer.accessToken, { title: 'Chamado B' });

    const response = await request(app)
      .patch('/notifications/read-all')
      .set('Authorization', `Bearer ${agent.accessToken}`);

    expect(response.status).toBe(204);

    const listAfter = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${agent.accessToken}`);

    expect(listAfter.body.unreadCount).toBe(0);
    expect(listAfter.body.items.every((n: { read: boolean }) => n.read)).toBe(true);
  });
});
