import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { JwtTokenService } from '../src/infrastructure/auth/jwt-token-service';
import { prisma } from '../src/infrastructure/database/prisma/client';
import { PrismaUserRepository } from '../src/infrastructure/database/repositories/prisma-user-repository';
import { createSocketServer } from '../src/infrastructure/realtime/socket-server';
import { createApp } from '../src/main/app';
import { env } from '../src/main/config/env';

const io = createSocketServer({
  userRepository: new PrismaUserRepository(prisma),
  tokenService: new JwtTokenService({
    secret: env.jwtSecret,
    accessExpiresIn: env.jwtAccessExpiresIn,
    refreshExpiresIn: env.jwtRefreshExpiresIn,
  }),
});
const app = createApp({ io });
const httpServer = createServer(app);
io.attach(httpServer);

let baseUrl = '';
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

const connect = (token: string): Promise<ClientSocket> =>
  new Promise((resolve, reject) => {
    const socket = ioClient(baseUrl, { auth: { token }, transports: ['websocket'], forceNew: true });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });

const waitForConnectError = (token: string): Promise<Error> =>
  new Promise((resolve) => {
    const socket = ioClient(baseUrl, { auth: { token }, transports: ['websocket'], forceNew: true });
    socket.once('connect_error', (err) => {
      socket.disconnect();
      resolve(err);
    });
  });

beforeAll(async () => {
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const { port } = httpServer.address() as AddressInfo;
  baseUrl = `http://localhost:${port}`;
});

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
  io.close();
});

describe('Socket.io — notificação de chamado criado', () => {
  it('agent conectado recebe "notification:new" quando um customer abre um chamado', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const agent = await registerAndLogin('AGENT');

    const socket = await connect(agent.accessToken);
    const eventPromise = new Promise<Record<string, unknown>>((resolve) => {
      socket.once('notification:new', resolve);
    });

    const createResponse = await createTicket(customer.accessToken, { title: 'Chamado em tempo real' });

    const event = await eventPromise;

    expect(event).toMatchObject({
      userId: agent.userId,
      type: 'TICKET_CREATED',
      ticketId: createResponse.body.id,
      ticketNumber: createResponse.body.number,
      read: false,
    });

    socket.disconnect();
  });

  it('admin conectado também recebe a notificação', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const admin = await registerAndLogin('ADMIN');

    const socket = await connect(admin.accessToken);
    const eventPromise = new Promise<Record<string, unknown>>((resolve) => {
      socket.once('notification:new', resolve);
    });

    await createTicket(customer.accessToken, { title: 'Outro chamado' });

    const event = await eventPromise;
    expect(event).toMatchObject({ userId: admin.userId, type: 'TICKET_CREATED' });

    socket.disconnect();
  });

  it('customer conectado não recebe a notificação de chamado criado', async () => {
    const customerA = await registerAndLogin('CUSTOMER');
    const customerB = await registerAndLogin('CUSTOMER');

    const socket = await connect(customerB.accessToken);
    let received = false;
    socket.once('notification:new', () => {
      received = true;
    });

    await createTicket(customerA.accessToken, { title: 'Chamado privado' });

    // Não há evento algum pra esperar aqui (é isso que o teste verifica), então
    // dá uma folga curta pra garantir que, se fosse chegar, já teria chegado.
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(received).toBe(false);
    socket.disconnect();
  });

  it('rejeita a conexão sem um token válido', async () => {
    const error = await waitForConnectError('token-invalido');
    expect(error).toBeInstanceOf(Error);
  });

  it('rejeita a conexão sem token nenhum', async () => {
    const error = await waitForConnectError('');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('Socket.io — notificação de chamado atualizado', () => {
  it('o solicitante recebe "notification:new" quando o agent muda o status', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const agent = await registerAndLogin('AGENT');

    const createResponse = await createTicket(customer.accessToken);
    const ticketNumber = createResponse.body.number;

    const socket = await connect(customer.accessToken);
    const eventPromise = new Promise<Record<string, unknown>>((resolve) => {
      socket.once('notification:new', resolve);
    });

    await request(app)
      .patch(`/tickets/${ticketNumber}/status`)
      .set('Authorization', `Bearer ${agent.accessToken}`)
      .send({ status: 'IN_PROGRESS' });

    const event = await eventPromise;
    expect(event).toMatchObject({
      userId: customer.userId,
      type: 'TICKET_UPDATED',
      ticketNumber,
    });
    expect(event.body).toContain('Em andamento');

    socket.disconnect();
  });

  it('quem faz a mudança não recebe notificação da própria ação', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const agent = await registerAndLogin('AGENT');

    const createResponse = await createTicket(customer.accessToken);
    const ticketNumber = createResponse.body.number;

    const socket = await connect(agent.accessToken);
    let received = false;
    socket.once('notification:new', () => {
      received = true;
    });

    await request(app)
      .patch(`/tickets/${ticketNumber}/status`)
      .set('Authorization', `Bearer ${agent.accessToken}`)
      .send({ status: 'IN_PROGRESS' });

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(received).toBe(false);

    socket.disconnect();
  });

  it('admin recebe "notification:new" mesmo sem ser o responsável pelo chamado', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const agentA = await registerAndLogin('AGENT');
    const admin = await registerAndLogin('ADMIN');

    const createResponse = await createTicket(customer.accessToken);
    const ticketNumber = createResponse.body.number;

    await request(app)
      .patch(`/tickets/${ticketNumber}/assign`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ assigneeIds: [agentA.userId] });

    const socket = await connect(admin.accessToken);
    const eventPromise = new Promise<Record<string, unknown>>((resolve) => {
      socket.once('notification:new', resolve);
    });

    await request(app)
      .patch(`/tickets/${ticketNumber}/status`)
      .set('Authorization', `Bearer ${agentA.accessToken}`)
      .send({ status: 'RESOLVED' });

    const event = await eventPromise;
    expect(event).toMatchObject({ userId: admin.userId, type: 'TICKET_UPDATED', ticketNumber });

    socket.disconnect();
  });

  it('agent atribuído recebe "notification:new"; agent não atribuído a um chamado já assumido não recebe', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const agentA = await registerAndLogin('AGENT');
    const agentB = await registerAndLogin('AGENT');
    const admin = await registerAndLogin('ADMIN');

    const createResponse = await createTicket(customer.accessToken);
    const ticketNumber = createResponse.body.number;

    await request(app)
      .patch(`/tickets/${ticketNumber}/assign`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ assigneeIds: [agentA.userId] });

    const socketA = await connect(agentA.accessToken);
    const socketB = await connect(agentB.accessToken);

    const eventPromise = new Promise<Record<string, unknown>>((resolve) => {
      socketA.once('notification:new', resolve);
    });
    let receivedByB = false;
    socketB.once('notification:new', () => {
      receivedByB = true;
    });

    // Quem muda o status é o admin, não agentA — senão agentA seria o próprio
    // ator e não receberia notificação da própria ação (comportamento esperado,
    // testado à parte).
    await request(app)
      .patch(`/tickets/${ticketNumber}/status`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ status: 'WAITING' });

    const event = await eventPromise;
    expect(event).toMatchObject({ userId: agentA.userId, type: 'TICKET_UPDATED', ticketNumber });

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(receivedByB).toBe(false);

    socketA.disconnect();
    socketB.disconnect();
  });

  it('agent recém-atribuído recebe "notification:new" da própria atribuição', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const agent = await registerAndLogin('AGENT');
    const admin = await registerAndLogin('ADMIN');

    const createResponse = await createTicket(customer.accessToken);
    const ticketNumber = createResponse.body.number;

    const socket = await connect(agent.accessToken);
    const eventPromise = new Promise<Record<string, unknown>>((resolve) => {
      socket.once('notification:new', resolve);
    });

    await request(app)
      .patch(`/tickets/${ticketNumber}/assign`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ assigneeIds: [agent.userId] });

    const event = await eventPromise;
    expect(event).toMatchObject({ userId: agent.userId, type: 'TICKET_UPDATED', ticketNumber });

    socket.disconnect();
  });

  it('agent não envolvido recebe "notification:new" quando o chamado (antes sem responsável) é atribuído a um admin', async () => {
    // Regressão: um chamado sem responsável some da fila de todo agent quando
    // é atribuído — mesmo que o novo responsável seja um admin (que não
    // participava da fila de agent nenhum). Todo agent precisa saber que ele
    // saiu da própria fila, não só quem ficou responsável.
    const customer = await registerAndLogin('CUSTOMER');
    const agent = await registerAndLogin('AGENT');
    const admin = await registerAndLogin('ADMIN');

    const createResponse = await createTicket(customer.accessToken);
    const ticketNumber = createResponse.body.number;

    const socket = await connect(agent.accessToken);
    const eventPromise = new Promise<Record<string, unknown>>((resolve) => {
      socket.once('notification:new', resolve);
    });

    await request(app)
      .patch(`/tickets/${ticketNumber}/assign`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ assigneeIds: [admin.userId] });

    const event = await eventPromise;
    expect(event).toMatchObject({ userId: agent.userId, type: 'TICKET_UPDATED', ticketNumber });

    socket.disconnect();
  });
});
