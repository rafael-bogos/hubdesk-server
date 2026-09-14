import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { TicketClosureScheduler } from '../src/domain/ports/ticket-closure-scheduler';
import { prisma } from '../src/infrastructure/database/prisma/client';
import { createApp } from '../src/main/app';

// Fake em memória: os use cases só enxergam a porta (TicketClosureScheduler),
// então dá pra verificar que schedule/cancel foram chamados com os
// parâmetros certos sem precisar de um Redis de verdade nesses testes.
class FakeTicketClosureScheduler implements TicketClosureScheduler {
  scheduled: { ticketId: string; runAt: Date }[] = [];
  cancelled: string[] = [];

  async schedule(ticketId: string, runAt: Date): Promise<void> {
    this.scheduled.push({ ticketId, runAt });
  }

  async cancel(ticketId: string): Promise<void> {
    this.cancelled.push(ticketId);
  }
}

const scheduler = new FakeTicketClosureScheduler();
const app = createApp({ ticketClosureScheduler: scheduler });

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

const createTicket = async (accessToken: string) =>
  request(app)
    .post('/tickets')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ title: 'Impressora não liga', description: 'A impressora do 3º andar não liga.' });

const futureDate = (hoursFromNow: number) => new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();

beforeEach(async () => {
  scheduler.scheduled = [];
  scheduler.cancelled = [];
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

describe('PATCH /tickets/:id/status — PENDING_CLOSURE', () => {
  it('exige scheduledClosureAt', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const agent = await registerAndLogin('AGENT');
    const ticket = await createTicket(customer.accessToken);

    const response = await request(app)
      .patch(`/tickets/${ticket.body.number}/status`)
      .set('Authorization', `Bearer ${agent.accessToken}`)
      .send({ status: 'PENDING_CLOSURE' });

    expect(response.status).toBe(400);
    expect(scheduler.scheduled).toHaveLength(0);
  });

  it('rejeita data no passado', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const agent = await registerAndLogin('AGENT');
    const ticket = await createTicket(customer.accessToken);

    const response = await request(app)
      .patch(`/tickets/${ticket.body.number}/status`)
      .set('Authorization', `Bearer ${agent.accessToken}`)
      .send({ status: 'PENDING_CLOSURE', scheduledClosureAt: new Date(Date.now() - 60_000).toISOString() });

    expect(response.status).toBe(400);
    expect(scheduler.scheduled).toHaveLength(0);
  });

  it('agenda o fechamento e persiste scheduledClosureAt', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const agent = await registerAndLogin('AGENT');
    const ticket = await createTicket(customer.accessToken);
    const runAt = futureDate(2);

    const response = await request(app)
      .patch(`/tickets/${ticket.body.number}/status`)
      .set('Authorization', `Bearer ${agent.accessToken}`)
      .send({ status: 'PENDING_CLOSURE', scheduledClosureAt: runAt });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('PENDING_CLOSURE');
    expect(new Date(response.body.scheduledClosureAt).toISOString()).toBe(runAt);

    expect(scheduler.scheduled).toHaveLength(1);
    expect(scheduler.scheduled[0].ticketId).toBe(ticket.body.id);
    expect(scheduler.scheduled[0].runAt.toISOString()).toBe(runAt);

    const getResponse = await request(app)
      .get(`/tickets/${ticket.body.number}`)
      .set('Authorization', `Bearer ${agent.accessToken}`);
    expect(getResponse.body.ticket.status).toBe('PENDING_CLOSURE');
  });

  it('trocar o status antes do prazo cancela o agendamento e limpa scheduledClosureAt', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const agent = await registerAndLogin('AGENT');
    const ticket = await createTicket(customer.accessToken);

    await request(app)
      .patch(`/tickets/${ticket.body.number}/status`)
      .set('Authorization', `Bearer ${agent.accessToken}`)
      .send({ status: 'PENDING_CLOSURE', scheduledClosureAt: futureDate(2) });

    const response = await request(app)
      .patch(`/tickets/${ticket.body.number}/status`)
      .set('Authorization', `Bearer ${agent.accessToken}`)
      .send({ status: 'OPEN' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OPEN');
    expect(response.body.scheduledClosureAt).toBeNull();
    expect(scheduler.cancelled).toEqual([ticket.body.id]);
  });

  it('reagendar (nova data) chama schedule de novo sem precisar cancelar manualmente', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const agent = await registerAndLogin('AGENT');
    const ticket = await createTicket(customer.accessToken);

    await request(app)
      .patch(`/tickets/${ticket.body.number}/status`)
      .set('Authorization', `Bearer ${agent.accessToken}`)
      .send({ status: 'PENDING_CLOSURE', scheduledClosureAt: futureDate(1) });

    const newRunAt = futureDate(5);
    const response = await request(app)
      .patch(`/tickets/${ticket.body.number}/status`)
      .set('Authorization', `Bearer ${agent.accessToken}`)
      .send({ status: 'PENDING_CLOSURE', scheduledClosureAt: newRunAt });

    expect(response.status).toBe(200);
    expect(new Date(response.body.scheduledClosureAt).toISOString()).toBe(newRunAt);
    expect(scheduler.scheduled).toHaveLength(2);
    expect(scheduler.scheduled[1].runAt.toISOString()).toBe(newRunAt);
  });

  it('customer não pode colocar chamado em PENDING_CLOSURE', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const ticket = await createTicket(customer.accessToken);

    const response = await request(app)
      .patch(`/tickets/${ticket.body.number}/status`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ status: 'PENDING_CLOSURE', scheduledClosureAt: futureDate(2) });

    expect(response.status).toBe(403);
  });
});

describe('PATCH /tickets/bulk — PENDING_CLOSURE', () => {
  it('exige scheduledClosureAt e aplica a mesma data a todos os chamados', async () => {
    const customer = await registerAndLogin('CUSTOMER');
    const agent = await registerAndLogin('AGENT');
    const ticketA = await createTicket(customer.accessToken);
    const ticketB = await createTicket(customer.accessToken);

    const missingDate = await request(app)
      .patch('/tickets/bulk')
      .set('Authorization', `Bearer ${agent.accessToken}`)
      .send({ ticketNumbers: [ticketA.body.number], status: 'PENDING_CLOSURE' });
    expect(missingDate.status).toBe(400);

    const runAt = futureDate(3);
    const response = await request(app)
      .patch('/tickets/bulk')
      .set('Authorization', `Bearer ${agent.accessToken}`)
      .send({ ticketNumbers: [ticketA.body.number, ticketB.body.number], status: 'PENDING_CLOSURE', scheduledClosureAt: runAt });

    expect(response.status).toBe(200);
    expect(response.body.updated).toHaveLength(2);
    expect(response.body.updated.every((t: { status: string }) => t.status === 'PENDING_CLOSURE')).toBe(true);
    expect(scheduler.scheduled).toHaveLength(2);
    expect(scheduler.scheduled.every((s) => s.runAt.toISOString() === runAt)).toBe(true);
  });
});
