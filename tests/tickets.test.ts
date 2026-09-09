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
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.ticketAssignee.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.ticketAssignee.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('POST /tickets', () => {
  it('customer cria um chamado como requester de si mesmo', async () => {
    const customer = await registerAndLogin('CUSTOMER');

    const response = await createTicket(customer.accessToken);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      title: 'Impressora não liga',
      status: 'OPEN',
      priority: 'MEDIUM',
      requesterId: customer.userId,
      assigneeIds: [],
    });
  });
});

describe('GET /tickets', () => {
  it('customer só vê os próprios chamados', async () => {
    const customerA = await registerAndLogin('CUSTOMER');
    const customerB = await registerAndLogin('CUSTOMER');

    await createTicket(customerA.accessToken, { title: 'Chamado A' });
    await createTicket(customerB.accessToken, { title: 'Chamado B' });

    const response = await request(app)
      .get('/tickets')
      .set('Authorization', `Bearer ${customerA.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      title: 'Chamado A',
      requesterId: customerA.userId,
      requester: { id: customerA.userId },
      assignees: [],
    });
  });

  it('agent vê todos os chamados', async () => {
    const customerA = await registerAndLogin('CUSTOMER');
    const customerB = await registerAndLogin('CUSTOMER');
    const agent = await registerAndLogin('AGENT');

    await createTicket(customerA.accessToken, { title: 'Chamado A' });
    await createTicket(customerB.accessToken, { title: 'Chamado B' });

    const response = await request(app).get('/tickets').set('Authorization', `Bearer ${agent.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.total).toBe(2);
  });
});

describe('GET /tickets/:id', () => {
  it('customer não consegue ver chamado de outro customer', async () => {
    const customerA = await registerAndLogin('CUSTOMER');
    const customerB = await registerAndLogin('CUSTOMER');

    const createResponse = await createTicket(customerA.accessToken);
    const ticketId = createResponse.body.id;

    const response = await request(app)
      .get(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${customerB.accessToken}`);

    expect(response.status).toBe(404);
  });

  it('agent consegue ver chamado de qualquer customer', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const agent = await registerAndLogin('AGENT');

    const createResponse = await createTicket(customer.accessToken);
    const ticketId = createResponse.body.id;

    const response = await request(app)
      .get(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${agent.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.ticket).toMatchObject({
      id: ticketId,
      requester: { id: customer.userId },
    });
  });
});

describe('PATCH /tickets/:id/assign e /status', () => {
  it('agent se atribui um chamado e muda o status', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const agent = await registerAndLogin('AGENT');

    const createResponse = await createTicket(customer.accessToken);
    const ticketId = createResponse.body.id;

    const assignResponse = await request(app)
      .patch(`/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${agent.accessToken}`)
      .send({ assigneeIds: [agent.userId] });

    expect(assignResponse.status).toBe(200);
    expect(assignResponse.body.assigneeIds).toEqual([agent.userId]);

    const statusResponse = await request(app)
      .patch(`/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${agent.accessToken}`)
      .send({ status: 'IN_PROGRESS' });

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.status).toBe('IN_PROGRESS');
  });

  it('agent atribui múltiplos responsáveis ao mesmo chamado', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const agentA = await registerAndLogin('AGENT');
    const agentB = await registerAndLogin('AGENT');

    const createResponse = await createTicket(customer.accessToken);
    const ticketId = createResponse.body.id;

    const assignResponse = await request(app)
      .patch(`/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${agentA.accessToken}`)
      .send({ assigneeIds: [agentA.userId, agentB.userId] });

    expect(assignResponse.status).toBe(200);
    expect(assignResponse.body.assigneeIds).toEqual(
      expect.arrayContaining([agentA.userId, agentB.userId]),
    );
    expect(assignResponse.body.assigneeIds).toHaveLength(2);

    const getResponse = await request(app)
      .get(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${agentA.accessToken}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.ticket.assignees).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: agentA.userId }),
        expect.objectContaining({ id: agentB.userId }),
      ]),
    );
  });

  it('customer não consegue mudar o status', async () => {
    const customer = await registerAndLogin('CUSTOMER');

    const createResponse = await createTicket(customer.accessToken);
    const ticketId = createResponse.body.id;

    const response = await request(app)
      .patch(`/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ status: 'IN_PROGRESS' });

    expect(response.status).toBe(403);
  });
});

describe('POST /tickets/:id/comments', () => {
  it('comentário interno de agent não aparece para o customer', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const agent = await registerAndLogin('AGENT');

    const createResponse = await createTicket(customer.accessToken);
    const ticketId = createResponse.body.id;

    const internalCommentResponse = await request(app)
      .post(`/tickets/${ticketId}/comments`)
      .set('Authorization', `Bearer ${agent.accessToken}`)
      .send({ body: 'Nota interna: verificar garantia', isInternal: true });

    expect(internalCommentResponse.status).toBe(201);
    expect(internalCommentResponse.body.isInternal).toBe(true);

    await request(app)
      .post(`/tickets/${ticketId}/comments`)
      .set('Authorization', `Bearer ${agent.accessToken}`)
      .send({ body: 'Já estamos verificando, obrigado pelo aviso!' });

    const customerView = await request(app)
      .get(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${customer.accessToken}`);

    expect(customerView.status).toBe(200);
    expect(customerView.body.comments).toHaveLength(1);
    expect(customerView.body.comments[0].isInternal).toBe(false);

    const agentView = await request(app)
      .get(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${agent.accessToken}`);

    expect(agentView.body.comments).toHaveLength(2);
  });

  it('customer não consegue criar comentário interno', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const createResponse = await createTicket(customer.accessToken);
    const ticketId = createResponse.body.id;

    const response = await request(app)
      .post(`/tickets/${ticketId}/comments`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ body: 'Alguma novidade?', isInternal: true });

    expect(response.status).toBe(201);
    expect(response.body.isInternal).toBe(false);
  });
});

describe('POST /tickets/:id/attachments', () => {
  it('faz upload de um anexo associado ao chamado correto', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const createResponse = await createTicket(customer.accessToken);
    const ticketId = createResponse.body.id;

    const response = await request(app)
      .post(`/tickets/${ticketId}/attachments`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .attach('file', Buffer.from('conteudo de teste'), {
        filename: 'evidencia.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ ticketId, filename: 'evidencia.txt', mimeType: 'text/plain' });

    const ticketResponse = await request(app)
      .get(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${customer.accessToken}`);

    expect(ticketResponse.body.attachments).toHaveLength(1);
  });
});

describe('GET /tickets/:id/attachments/:attachmentId', () => {
  it('dono do chamado consegue baixar o anexo com o conteúdo correto', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const createResponse = await createTicket(customer.accessToken);
    const ticketId = createResponse.body.id;

    const uploadResponse = await request(app)
      .post(`/tickets/${ticketId}/attachments`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .attach('file', Buffer.from('conteudo de teste'), {
        filename: 'evidencia.txt',
        contentType: 'text/plain',
      });

    const attachmentId = uploadResponse.body.id;

    const downloadResponse = await request(app)
      .get(`/tickets/${ticketId}/attachments/${attachmentId}`)
      .set('Authorization', `Bearer ${customer.accessToken}`);

    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers['content-type']).toContain('text/plain');
    expect(downloadResponse.headers['content-disposition']).toContain('evidencia.txt');
    expect(downloadResponse.text).toBe('conteudo de teste');
  });

  it('outro customer não consegue baixar anexo de chamado alheio', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const otherCustomer = await registerAndLogin('CUSTOMER');
    const createResponse = await createTicket(customer.accessToken);
    const ticketId = createResponse.body.id;

    const uploadResponse = await request(app)
      .post(`/tickets/${ticketId}/attachments`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .attach('file', Buffer.from('conteudo de teste'), {
        filename: 'evidencia.txt',
        contentType: 'text/plain',
      });

    const attachmentId = uploadResponse.body.id;

    const response = await request(app)
      .get(`/tickets/${ticketId}/attachments/${attachmentId}`)
      .set('Authorization', `Bearer ${otherCustomer.accessToken}`);

    expect(response.status).toBe(404);
  });
});
