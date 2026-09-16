import { describe, expect, it } from 'vitest';
import { TicketNotificationService } from '../src/application/services/ticket-notification-service';
import { Ticket } from '../src/domain/entities/ticket.entity';
import { User } from '../src/domain/entities/user.entity';
import { EmailSender, SendEmailInput } from '../src/domain/ports/email-sender';
import { RealtimeNotifier } from '../src/domain/ports/realtime-notifier';
import {
  CreateNotificationData,
  ListNotificationsResult,
  NotificationRepository,
} from '../src/domain/repositories/notification-repository';
import { ListUsersFilters, ListUsersResult, UserRepository } from '../src/domain/repositories/user-repository';

// Fakes em memória — só as portas (interfaces) importam pra testar a lógica
// de gating de e-mail por preferência, sem Prisma/Resend de verdade.

const baseTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 'ticket-1',
  number: 7,
  title: 'Chamado de teste',
  description: 'descrição',
  status: 'OPEN',
  priority: 'MEDIUM',
  requesterId: 'requester-1',
  assigneeIds: [],
  categoryId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  closedAt: null,
  scheduledClosureAt: null,
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
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

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
    const items = this.users.filter(
      (user) => (!roles || roles.includes(user.role)) && (filters.active === undefined || user.active === filters.active),
    );
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

describe('TicketNotificationService.notifyTicketUpdated — e-mail', () => {
  it('não manda e-mail de atualização pra quem desligou a preferência, mas cria a notificação in-app', async () => {
    const requester = baseUser({
      id: 'requester-1',
      email: 'requester@example.com',
      emailOnTicketUpdated: false,
    });
    const userRepository = new FakeUserRepository([requester]);
    const notificationRepository = new FakeNotificationRepository();
    const emailSender = new FakeEmailSender();
    const service = new TicketNotificationService(
      userRepository,
      notificationRepository,
      new FakeRealtimeNotifier(),
      emailSender,
    );

    const ticket = baseTicket({ requesterId: 'requester-1', status: 'IN_PROGRESS' });
    await service.notifyTicketUpdated(ticket, 'someone-else', ['status']);

    expect(notificationRepository.created.map((n) => n.userId)).toContain('requester-1');
    expect(emailSender.sent).toHaveLength(0);
  });

  it('manda e-mail de atualização pra quem mantém a preferência ligada', async () => {
    const requester = baseUser({ id: 'requester-1', email: 'requester@example.com' });
    const userRepository = new FakeUserRepository([requester]);
    const emailSender = new FakeEmailSender();
    const service = new TicketNotificationService(
      userRepository,
      new FakeNotificationRepository(),
      new FakeRealtimeNotifier(),
      emailSender,
    );

    const ticket = baseTicket({ requesterId: 'requester-1', status: 'IN_PROGRESS' });
    await service.notifyTicketUpdated(ticket, 'someone-else', ['status']);

    expect(emailSender.sent).toHaveLength(1);
    expect(emailSender.sent[0]).toMatchObject({
      to: 'requester@example.com',
      subject: 'Chamado #7 atualizado',
    });
  });

  it('quem fez a mudança nunca recebe e-mail sobre a própria ação', async () => {
    const admin = baseUser({ id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' });
    const userRepository = new FakeUserRepository([admin]);
    const emailSender = new FakeEmailSender();
    const service = new TicketNotificationService(
      userRepository,
      new FakeNotificationRepository(),
      new FakeRealtimeNotifier(),
      emailSender,
    );

    const ticket = baseTicket({ requesterId: 'admin-1', status: 'IN_PROGRESS' });
    await service.notifyTicketUpdated(ticket, 'admin-1', ['status']);

    expect(emailSender.sent).toHaveLength(0);
  });

  it('quando o status vira RESOLVED, usa a preferência de fechamento em vez da de atualização', async () => {
    const requester = baseUser({
      id: 'requester-1',
      email: 'requester@example.com',
      emailOnTicketUpdated: false,
      emailOnTicketClosed: true,
    });
    const userRepository = new FakeUserRepository([requester]);
    const emailSender = new FakeEmailSender();
    const service = new TicketNotificationService(
      userRepository,
      new FakeNotificationRepository(),
      new FakeRealtimeNotifier(),
      emailSender,
    );

    const ticket = baseTicket({ requesterId: 'requester-1', status: 'RESOLVED' });
    await service.notifyTicketUpdated(ticket, 'someone-else', ['status']);

    expect(emailSender.sent).toHaveLength(1);
    expect(emailSender.sent[0]).toMatchObject({
      to: 'requester@example.com',
      subject: 'Chamado #7 fechado',
    });
  });

  it('não manda e-mail de fechamento pra quem desligou essa preferência', async () => {
    const requester = baseUser({
      id: 'requester-1',
      email: 'requester@example.com',
      emailOnTicketClosed: false,
    });
    const userRepository = new FakeUserRepository([requester]);
    const emailSender = new FakeEmailSender();
    const service = new TicketNotificationService(
      userRepository,
      new FakeNotificationRepository(),
      new FakeRealtimeNotifier(),
      emailSender,
    );

    const ticket = baseTicket({ requesterId: 'requester-1', status: 'RESOLVED' });
    await service.notifyTicketUpdated(ticket, 'someone-else', ['status']);

    expect(emailSender.sent).toHaveLength(0);
  });
});
