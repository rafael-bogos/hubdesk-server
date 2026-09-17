import { describe, expect, it } from 'vitest';
import { TicketNotificationService } from '../src/application/services/ticket-notification-service';
import { SlaSettings } from '../src/domain/entities/sla-settings.entity';
import { Ticket } from '../src/domain/entities/ticket.entity';
import { User } from '../src/domain/entities/user.entity';
import { EmailSender, SendEmailInput } from '../src/domain/ports/email-sender';
import { RealtimeNotifier } from '../src/domain/ports/realtime-notifier';
import {
  CreateNotificationData,
  ListNotificationsResult,
  NotificationRepository,
} from '../src/domain/repositories/notification-repository';
import { SlaSettingsRepository, UpdateSlaSettingsData } from '../src/domain/repositories/sla-settings-repository';
import { ListTicketsResult, TicketRepository, UpdateTicketData } from '../src/domain/repositories/ticket-repository';
import { ListUsersFilters, ListUsersResult, UserRepository } from '../src/domain/repositories/user-repository';
import { processSlaScanJob } from '../src/infrastructure/queue/process-sla-scan-job';

// Fakes em memória — só as portas (interfaces) importam pra testar a lógica
// do job sem Prisma/Redis/Resend de verdade.

const settings: SlaSettings = {
  lowPriorityHours: 72,
  mediumPriorityHours: 24,
  highPriorityHours: 8,
  urgentPriorityHours: 4,
  warningThresholdPercent: 80,
  updatedAt: new Date(),
};

const HOUR = 3_600_000;

const baseTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 'ticket-1',
  number: 1,
  title: 'Chamado de teste',
  description: 'descrição',
  status: 'OPEN',
  priority: 'URGENT',
  requesterId: 'requester-1',
  assigneeIds: [],
  categoryId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  closedAt: null,
  scheduledClosureAt: null,
  slaPausedAt: null,
  slaPausedDurationMs: 0,
  slaWarningNotifiedAt: null,
  ...overrides,
});

const baseUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  name: 'User',
  email: 'user@example.com',
  passwordHash: '',
  role: 'CUSTOMER',
  tokenVersion: 0,
  active: true,
  emailOnTicketUpdated: true,
  emailOnTicketClosed: true,
  emailOnSlaWarning: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

class FakeTicketRepository implements TicketRepository {
  updateCalls: { id: string; data: UpdateTicketData }[] = [];

  constructor(private tickets: Ticket[]) {}

  async create(): Promise<Ticket> {
    throw new Error('not implemented');
  }

  async findById(id: string): Promise<Ticket | null> {
    return this.tickets.find((ticket) => ticket.id === id) ?? null;
  }

  async findByNumber(): Promise<Ticket | null> {
    throw new Error('not implemented');
  }

  async list(): Promise<ListTicketsResult> {
    throw new Error('not implemented');
  }

  async update(id: string, data: UpdateTicketData): Promise<Ticket> {
    this.updateCalls.push({ id, data });
    const index = this.tickets.findIndex((ticket) => ticket.id === id);
    this.tickets[index] = { ...this.tickets[index], ...data };
    return this.tickets[index];
  }

  async findAllUnresolved(): Promise<Ticket[]> {
    return this.tickets.filter((ticket) => ticket.status !== 'RESOLVED');
  }

  async setAssignees(): Promise<Ticket> {
    throw new Error('not implemented');
  }
}

class FakeSlaSettingsRepository implements SlaSettingsRepository {
  async get(): Promise<SlaSettings> {
    return settings;
  }

  async update(data: UpdateSlaSettingsData): Promise<SlaSettings> {
    return { ...settings, ...data };
  }
}

class FakeUserRepository implements UserRepository {
  constructor(private readonly users: User[]) {}

  async findById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async findByEmail(): Promise<User | null> {
    throw new Error('not implemented');
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

  async list(filters: ListUsersFilters): Promise<ListUsersResult> {
    const roles = filters.role ? (Array.isArray(filters.role) ? filters.role : [filters.role]) : null;
    const items = this.users.filter((user) => !roles || roles.includes(user.role));
    return { items, total: items.length, page: filters.page, pageSize: filters.pageSize };
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
  pushNotification(): void {}
  pushTicketMessage(): void {}
}

class FakeEmailSender implements EmailSender {
  sent: SendEmailInput[] = [];

  async send(input: SendEmailInput): Promise<void> {
    this.sent.push(input);
  }
}

describe('processSlaScanJob', () => {
  it('avisa (in-app + e-mail) um chamado perto de estourar ainda não avisado, e grava o dedupe', async () => {
    const assignee = baseUser({ id: 'agent-1', email: 'agent@example.com', role: 'AGENT' });
    const ticket = baseTicket({
      // URGENT = 4h; criado há 3h30 = 87.5% consumido, acima do limiar de 80%.
      createdAt: new Date(Date.now() - 3.5 * HOUR),
      assigneeIds: ['agent-1'],
    });
    const ticketRepository = new FakeTicketRepository([ticket]);
    const notificationRepository = new FakeNotificationRepository();
    const emailSender = new FakeEmailSender();
    const ticketNotificationService = new TicketNotificationService(
      new FakeUserRepository([assignee]),
      notificationRepository,
      new FakeRealtimeNotifier(),
      emailSender,
    );

    await processSlaScanJob(ticketRepository, new FakeSlaSettingsRepository(), ticketNotificationService);

    expect(notificationRepository.created).toHaveLength(1);
    expect(notificationRepository.created[0]).toMatchObject({ type: 'SLA_WARNING', userId: 'agent-1' });
    expect(emailSender.sent).toHaveLength(1);
    expect(emailSender.sent[0]).toMatchObject({ to: 'agent@example.com' });

    expect(ticketRepository.updateCalls).toHaveLength(1);
    expect(ticketRepository.updateCalls[0].data.slaWarningNotifiedAt).toBeInstanceOf(Date);
  });

  it('não avisa de novo um chamado que já foi avisado (dedupe)', async () => {
    const ticket = baseTicket({
      createdAt: new Date(Date.now() - 3.5 * HOUR),
      slaWarningNotifiedAt: new Date(),
    });
    const ticketRepository = new FakeTicketRepository([ticket]);
    const notificationRepository = new FakeNotificationRepository();
    const ticketNotificationService = new TicketNotificationService(
      new FakeUserRepository([]),
      notificationRepository,
      new FakeRealtimeNotifier(),
      new FakeEmailSender(),
    );

    await processSlaScanJob(ticketRepository, new FakeSlaSettingsRepository(), ticketNotificationService);

    expect(notificationRepository.created).toHaveLength(0);
    expect(ticketRepository.updateCalls).toHaveLength(0);
  });

  it('não avisa um chamado que ainda está "ok"', async () => {
    const ticket = baseTicket({ createdAt: new Date() });
    const ticketRepository = new FakeTicketRepository([ticket]);
    const notificationRepository = new FakeNotificationRepository();
    const ticketNotificationService = new TicketNotificationService(
      new FakeUserRepository([]),
      notificationRepository,
      new FakeRealtimeNotifier(),
      new FakeEmailSender(),
    );

    await processSlaScanJob(ticketRepository, new FakeSlaSettingsRepository(), ticketNotificationService);

    expect(notificationRepository.created).toHaveLength(0);
  });

  it('destinatários são o(s) responsável(is) + admins — nunca "todo agent"', async () => {
    const assignee = baseUser({ id: 'agent-assigned', email: 'assigned@example.com', role: 'AGENT' });
    const bystanderAgent = baseUser({ id: 'agent-bystander', email: 'bystander@example.com', role: 'AGENT' });
    const admin = baseUser({ id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' });
    const ticket = baseTicket({
      createdAt: new Date(Date.now() - 3.5 * HOUR),
      assigneeIds: ['agent-assigned'],
    });
    const ticketRepository = new FakeTicketRepository([ticket]);
    const notificationRepository = new FakeNotificationRepository();
    const ticketNotificationService = new TicketNotificationService(
      new FakeUserRepository([assignee, bystanderAgent, admin]),
      notificationRepository,
      new FakeRealtimeNotifier(),
      new FakeEmailSender(),
    );

    await processSlaScanJob(ticketRepository, new FakeSlaSettingsRepository(), ticketNotificationService);

    const notifiedIds = notificationRepository.created.map((n) => n.userId);
    expect(notifiedIds).toEqual(expect.arrayContaining(['agent-assigned', 'admin-1']));
    expect(notifiedIds).not.toContain('agent-bystander');
  });

  it('ignora chamados já resolvidos', async () => {
    const ticket = baseTicket({
      status: 'RESOLVED',
      createdAt: new Date(Date.now() - 10 * HOUR),
      closedAt: new Date(Date.now() - 9 * HOUR),
    });
    const ticketRepository = new FakeTicketRepository([ticket]);
    const notificationRepository = new FakeNotificationRepository();
    const ticketNotificationService = new TicketNotificationService(
      new FakeUserRepository([]),
      notificationRepository,
      new FakeRealtimeNotifier(),
      new FakeEmailSender(),
    );

    await processSlaScanJob(ticketRepository, new FakeSlaSettingsRepository(), ticketNotificationService);

    expect(notificationRepository.created).toHaveLength(0);
  });
});
