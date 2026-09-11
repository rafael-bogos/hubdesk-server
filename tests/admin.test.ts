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

describe('acesso a /admin/*', () => {
  it('admin acessa normalmente', async () => {
    const admin = await registerAndLogin('ADMIN');

    const response = await request(app).get('/admin/users').set('Authorization', `Bearer ${admin.accessToken}`);

    expect(response.status).toBe(200);
  });

  it('agent recebe 403', async () => {
    const agent = await registerAndLogin('AGENT');

    const response = await request(app).get('/admin/users').set('Authorization', `Bearer ${agent.accessToken}`);

    expect(response.status).toBe(403);
  });

  it('customer recebe 403', async () => {
    const customer = await registerAndLogin('CUSTOMER');

    const response = await request(app).get('/admin/users').set('Authorization', `Bearer ${customer.accessToken}`);

    expect(response.status).toBe(403);
  });

  it('sem token recebe 401', async () => {
    const response = await request(app).get('/admin/dashboard');
    expect(response.status).toBe(401);
  });
});

describe('POST /admin/users e PATCH /admin/users/:id', () => {
  it('admin cria um usuário com role definida e sem expor passwordHash', async () => {
    const admin = await registerAndLogin('ADMIN');

    const response = await request(app)
      .post('/admin/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Novo Agente', email: 'agente@example.com', password: 'password123', role: 'AGENT' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: 'Novo Agente', email: 'agente@example.com', role: 'AGENT' });
    expect(response.body.passwordHash).toBeUndefined();

    const auditEntries = await prisma.auditLog.findMany({ where: { action: 'CREATE_USER' } });
    expect(auditEntries).toHaveLength(1);
  });

  it('mudar o role de um usuário invalida o token antigo dele', async () => {
    const admin = await registerAndLogin('ADMIN');
    const target = await registerAndLogin('CUSTOMER');

    const meBeforeResponse = await request(app).get('/auth/me').set('Authorization', `Bearer ${target.accessToken}`);
    expect(meBeforeResponse.status).toBe(200);

    const updateResponse = await request(app)
      .patch(`/admin/users/${target.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ role: 'AGENT' });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.role).toBe('AGENT');

    const meAfterResponse = await request(app).get('/auth/me').set('Authorization', `Bearer ${target.accessToken}`);
    expect(meAfterResponse.status).toBe(401);

    const auditEntries = await prisma.auditLog.findMany({ where: { action: 'UPDATE_USER_ACCESS' } });
    expect(auditEntries).toHaveLength(1);
  });

  it('desativar um usuário também invalida o token antigo', async () => {
    const admin = await registerAndLogin('ADMIN');
    const target = await registerAndLogin('CUSTOMER');

    const updateResponse = await request(app)
      .patch(`/admin/users/${target.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ active: false });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.active).toBe(false);

    const meResponse = await request(app).get('/auth/me').set('Authorization', `Bearer ${target.accessToken}`);
    expect(meResponse.status).toBe(401);
  });
});

describe('DELETE /admin/users/:id', () => {
  it('admin exclui (desativa) um agente e invalida o token antigo dele', async () => {
    const admin = await registerAndLogin('ADMIN');
    const agent = await registerAndLogin('AGENT');

    const deleteResponse = await request(app)
      .delete(`/admin/users/${agent.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.active).toBe(false);

    const meResponse = await request(app).get('/auth/me').set('Authorization', `Bearer ${agent.accessToken}`);
    expect(meResponse.status).toBe(401);

    const auditEntries = await prisma.auditLog.findMany({ where: { action: 'DELETE_USER' } });
    expect(auditEntries).toHaveLength(1);
  });

  it('admin não consegue excluir a própria conta', async () => {
    const admin = await registerAndLogin('ADMIN');

    const response = await request(app)
      .delete(`/admin/users/${admin.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(response.status).toBe(400);
  });

  it('admin não consegue excluir outro admin', async () => {
    const admin = await registerAndLogin('ADMIN');
    const otherAdmin = await registerAndLogin('ADMIN');

    const response = await request(app)
      .delete(`/admin/users/${otherAdmin.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(response.status).toBe(400);
  });

  it('agent e customer recebem 403', async () => {
    const agent = await registerAndLogin('AGENT');
    const customer = await registerAndLogin('CUSTOMER');
    const target = await registerAndLogin('CUSTOMER');

    const agentResponse = await request(app)
      .delete(`/admin/users/${target.userId}`)
      .set('Authorization', `Bearer ${agent.accessToken}`);
    expect(agentResponse.status).toBe(403);

    const customerResponse = await request(app)
      .delete(`/admin/users/${target.userId}`)
      .set('Authorization', `Bearer ${customer.accessToken}`);
    expect(customerResponse.status).toBe(403);
  });

  it('sem token recebe 401', async () => {
    const target = await registerAndLogin('CUSTOMER');
    const response = await request(app).delete(`/admin/users/${target.userId}`);
    expect(response.status).toBe(401);
  });

  it('id inexistente recebe 404', async () => {
    const admin = await registerAndLogin('ADMIN');

    const response = await request(app)
      .delete('/admin/users/id-que-nao-existe')
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(response.status).toBe(404);
  });
});

describe('GET /admin/users?active=', () => {
  it('filtra corretamente por active=true e active=false', async () => {
    const admin = await registerAndLogin('ADMIN');
    const activeUser = await registerAndLogin('CUSTOMER');
    const inactiveUser = await registerAndLogin('CUSTOMER');

    await request(app)
      .delete(`/admin/users/${inactiveUser.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);

    const activeResponse = await request(app)
      .get('/admin/users?active=true')
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(activeResponse.status).toBe(200);
    expect(activeResponse.body.items.map((u: { id: string }) => u.id)).toContain(activeUser.userId);
    expect(activeResponse.body.items.map((u: { id: string }) => u.id)).not.toContain(
      inactiveUser.userId,
    );

    const inactiveResponse = await request(app)
      .get('/admin/users?active=false')
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(inactiveResponse.status).toBe(200);
    expect(inactiveResponse.body.items.map((u: { id: string }) => u.id)).toContain(
      inactiveUser.userId,
    );
    expect(inactiveResponse.body.items.map((u: { id: string }) => u.id)).not.toContain(
      activeUser.userId,
    );
  });
});

describe('categorias', () => {
  it('admin cria e atualiza uma categoria', async () => {
    const admin = await registerAndLogin('ADMIN');

    const createResponse = await request(app)
      .post('/admin/categories')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Hardware' });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({ name: 'Hardware', active: true });

    const updateResponse = await request(app)
      .patch(`/admin/categories/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ active: false });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.active).toBe(false);

    const auditEntries = await prisma.auditLog.findMany({ where: { entity: 'Category' } });
    expect(auditEntries).toHaveLength(2);
  });
});

describe('GET /admin/dashboard', () => {
  it('retorna as contagens esperadas para um cenário conhecido', async () => {
    const admin = await registerAndLogin('ADMIN');
    const agent = await registerAndLogin('AGENT');
    const customer = await registerAndLogin('CUSTOMER');

    const createTicket = (accessToken: string, title: string) =>
      request(app)
        .post('/tickets')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title, description: 'Descrição de teste' });

    const ticketAResponse = await createTicket(customer.accessToken, 'Chamado A');
    await createTicket(customer.accessToken, 'Chamado B');

    await request(app)
      .patch(`/tickets/${ticketAResponse.body.number}/assign`)
      .set('Authorization', `Bearer ${agent.accessToken}`)
      .send({ assigneeIds: [agent.userId] });

    const response = await request(app)
      .get('/admin/dashboard')
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.ticketsByStatus.OPEN).toBe(2);
    expect(response.body.ticketsByPriority.MEDIUM).toBe(2);
    expect(response.body.usersByRole).toMatchObject({ ADMIN: 1, AGENT: 1, CUSTOMER: 1 });
    expect(response.body.openTicketsByAgent).toContainEqual(
      expect.objectContaining({ agentId: agent.userId, count: 1 }),
    );
  });
});
