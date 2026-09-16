import { describe, expect, it } from 'vitest';
import { TicketNotificationService } from '../src/application/services/ticket-notification-service';
import { Ticket } from '../src/domain/entities/ticket.entity';
import { EmailSender, SendEmailInput } from '../src/domain/ports/email-sender';
import { RealtimeNotifier } from '../src/domain/ports/realtime-notifier';
import {
  CreateNotificationData,
  ListNotificationsResult,
  NotificationRepository,
} from '../src/domain/repositories/notification-repository';
import { ListTicketsResult, TicketRepository, UpdateTicketData } from '../src/domain/repositories/ticket-repository';
import { ListUsersResult, UserRepository } from '../src/domain/repositories/user-repository';
import { processTicketClosureJob } from '../src/infrastructure/queue/process-ticket-closure-job';

// Fakes em memória pra testar a lógica do job sem Prisma/Redis de verdade —
// só as portas (interfaces) importam aqui.

const baseTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 'ticket-1',
  number: 42,
  title: 'Chamado de teste',
  description: 'descrição',
  status: 'PENDING_CLOSURE',
  priority: 'MEDIUM',
  requesterId: 'requester-1',
  assigneeIds: [],
  categoryId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  closedAt: null,
  scheduledClosureAt: new Date(),
  ...overrides,
});

class FakeTicketRepository implements TicketRepository {
  updateCalls: { id: string; data: UpdateTicketData }[] = [];

  constructor(private ticket: Ticket | null) {}

  async create(): Promise<Ticket> {
    throw new Error('not implemented');
  }

  async findById(id: string): Promise<Ticket | null> {
    return this.ticket && this.ticket.id === id ? this.ticket : null;
  }

  async findByNumber(): Promise<Ticket | null> {
    throw new Error('not implemented');
  }

  async list(): Promise<ListTicketsResult> {
    throw new Error('not implemented');
  }

  async update(id: string, data: UpdateTicketData): Promise<Ticket> {
    this.updateCalls.push({ id, data });
    this.ticket = { ...(this.ticket as Ticket), ...data };
    return this.ticket;
  }

  async setAssignees(): Promise<Ticket> {
    throw new Error('not implemented');
  }
}

class FakeUserRepository implements UserRepository {
  async findById() {
    return null;
  }

  async findByEmail() {
    return null;
  }

  async create(): Promise<never> {
    throw new Error('not implemented');
  }

  async update(): Promise<never> {
    throw new Error('not implemented');
  }

  async incrementTokenVersion(): Promise<never> {
    throw new Error('not implemented');
  }

  async list(): Promise<ListUsersResult> {
    return { items: [], total: 0, page: 1, pageSize: 100 };
  }
}

class FakeNotificationRepository implements NotificationRepository {
  created: CreateNotificationData[] = [];

  async create(data: CreateNotificationData) {
    this.created.push(data);
    return { id: `notif-${this.created.length}`, read: false, createdAt: new Date(), ...data };
  }

  async listByUserId(): Promise<ListNotificationsResult> {
    throw new Error('not implemented');
  }

  async markAsRead(): Promise<never> {
    throw new Error('not implemented');
  }

  async markAllAsRead(): Promise<void> {}
}

class FakeRealtimeNotifier implements RealtimeNotifier {
  pushed: unknown[] = [];

  pushNotification(notification: unknown): void {
    this.pushed.push(notification);
  }

  pushTicketMessage(): void {}
}

class FakeEmailSender implements EmailSender {
  sent: SendEmailInput[] = [];

  async send(input: SendEmailInput): Promise<void> {
    this.sent.push(input);
  }
}

describe('processTicketClosureJob', () => {
  it('fecha (RESOLVED) um chamado que ainda está PENDING_CLOSURE e notifica o solicitante', async () => {
    const ticketRepository = new FakeTicketRepository(baseTicket());
    const notificationRepository = new FakeNotificationRepository();
    const ticketNotificationService = new TicketNotificationService(
      new FakeUserRepository(),
      notificationRepository,
      new FakeRealtimeNotifier(),
      new FakeEmailSender(),
    );

    await processTicketClosureJob('ticket-1', ticketRepository, ticketNotificationService);

    expect(ticketRepository.updateCalls).toHaveLength(1);
    expect(ticketRepository.updateCalls[0].data).toMatchObject({
      status: 'RESOLVED',
      scheduledClosureAt: null,
    });
    expect(ticketRepository.updateCalls[0].data.closedAt).toBeInstanceOf(Date);

    expect(notificationRepository.created).toHaveLength(1);
    expect(notificationRepository.created[0]).toMatchObject({ userId: 'requester-1', ticketId: 'ticket-1' });
  });

  it('não faz nada se o chamado já mudou de status antes do job rodar', async () => {
    const ticketRepository = new FakeTicketRepository(baseTicket({ status: 'OPEN', scheduledClosureAt: null }));
    const notificationRepository = new FakeNotificationRepository();
    const ticketNotificationService = new TicketNotificationService(
      new FakeUserRepository(),
      notificationRepository,
      new FakeRealtimeNotifier(),
      new FakeEmailSender(),
    );

    await processTicketClosureJob('ticket-1', ticketRepository, ticketNotificationService);

    expect(ticketRepository.updateCalls).toHaveLength(0);
    expect(notificationRepository.created).toHaveLength(0);
  });

  it('não faz nada (e não lança) se o chamado não existe mais', async () => {
    const ticketRepository = new FakeTicketRepository(null);
    const notificationRepository = new FakeNotificationRepository();
    const ticketNotificationService = new TicketNotificationService(
      new FakeUserRepository(),
      notificationRepository,
      new FakeRealtimeNotifier(),
      new FakeEmailSender(),
    );

    await expect(
      processTicketClosureJob('ticket-1', ticketRepository, ticketNotificationService),
    ).resolves.toBeUndefined();
    expect(ticketRepository.updateCalls).toHaveLength(0);
  });
});
