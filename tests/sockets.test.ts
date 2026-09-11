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
  io.close();
});

describe('Socket.io — notificação de chamado criado', () => {
  it('agent conectado recebe "ticket:created" quando um customer abre um chamado', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const agent = await registerAndLogin('AGENT');

    const socket = await connect(agent.accessToken);
    const eventPromise = new Promise<Record<string, unknown>>((resolve) => {
      socket.once('ticket:created', resolve);
    });

    const createResponse = await request(app)
      .post('/tickets')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ title: 'Chamado em tempo real', description: 'teste' });

    const event = await eventPromise;

    expect(event).toMatchObject({
      id: createResponse.body.id,
      number: createResponse.body.number,
      title: 'Chamado em tempo real',
    });

    socket.disconnect();
  });

  it('admin conectado também recebe a notificação', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const admin = await registerAndLogin('ADMIN');

    const socket = await connect(admin.accessToken);
    const eventPromise = new Promise<Record<string, unknown>>((resolve) => {
      socket.once('ticket:created', resolve);
    });

    await request(app)
      .post('/tickets')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ title: 'Outro chamado', description: 'teste' });

    const event = await eventPromise;
    expect(event).toMatchObject({ title: 'Outro chamado' });

    socket.disconnect();
  });

  it('customer conectado não recebe a notificação de chamado criado', async () => {
    const customerA = await registerAndLogin('CUSTOMER');
    const customerB = await registerAndLogin('CUSTOMER');

    const socket = await connect(customerB.accessToken);
    let received = false;
    socket.once('ticket:created', () => {
      received = true;
    });

    await request(app)
      .post('/tickets')
      .set('Authorization', `Bearer ${customerA.accessToken}`)
      .send({ title: 'Chamado privado', description: 'teste' });

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
