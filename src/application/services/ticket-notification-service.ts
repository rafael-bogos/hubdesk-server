import { Ticket, TicketStatus } from '../../domain/entities/ticket.entity';
import { RealtimeNotifier } from '../../domain/ports/realtime-notifier';
import { CreateNotificationData, NotificationRepository } from '../../domain/repositories/notification-repository';
import { UserRepository } from '../../domain/repositories/user-repository';

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  WAITING: 'Aguardando',
  RESOLVED: 'Resolvido',
};

// Mesmo limite de list-agents.use-case.ts — staff além disso não seria
// notificado (aceito como limitação conhecida, não é o foco desta feature).
const MAX_STAFF = 100;

// Ponto único onde "quem deve saber que esse chamado mudou" é decidido — as
// mesmas regras de visibilidade de ticket-access.ts (canViewTicket), só que
// aqui precisam virar uma lista concreta de userIds (pra gravar uma
// notificação por pessoa), não uma sala de socket.
export class TicketNotificationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly realtimeNotifier: RealtimeNotifier,
  ) {}

  async notifyTicketCreated(ticket: Ticket): Promise<void> {
    // Chamado recém-criado nunca tem responsável ainda — visível a todo
    // agent/admin.
    const staffIds = await this.staffIds();

    await this.dispatch(staffIds, {
      type: 'TICKET_CREATED',
      title: `Novo chamado #${ticket.number}`,
      body: ticket.title,
      ticketId: ticket.id,
      ticketNumber: ticket.number,
    });
  }

  async notifyTicketUpdated(
    ticket: Ticket,
    actorId: string,
    changeType: 'status' | 'assignment',
  ): Promise<void> {
    const recipientIds = await this.updateRecipientIds(ticket, changeType);
    recipientIds.delete(actorId); // quem fez a mudança já vê o resultado na própria tela

    const detail =
      changeType === 'status' ? `Novo status: ${STATUS_LABELS[ticket.status]}` : 'Responsável atualizado';

    await this.dispatch([...recipientIds], {
      type: 'TICKET_UPDATED',
      title: `Chamado #${ticket.number} atualizado`,
      body: `${ticket.title} · ${detail}`,
      ticketId: ticket.id,
      ticketNumber: ticket.number,
    });
  }

  // Mensagem nova (comentário/anexo) não vira notificação persistida — seria
  // barulho demais no sino a cada mensagem do chat. É só um empurrão em tempo
  // real pra quem já pode ver o chamado, pra atualizar a conversa se estiver
  // aberta na tela. Nota interna nunca vai pro solicitante (ele não pode nem
  // ver a mensagem).
  async notifyTicketMessage(ticket: Ticket, authorId: string, isInternal: boolean): Promise<void> {
    const recipientIds = await this.updateRecipientIds(ticket, 'status');
    recipientIds.delete(authorId);
    if (isInternal) {
      recipientIds.delete(ticket.requesterId);
    }

    recipientIds.forEach((userId) => this.realtimeNotifier.pushTicketMessage(userId, ticket.number));
  }

  private async dispatch(userIds: string[], data: Omit<CreateNotificationData, 'userId'>): Promise<void> {
    await Promise.all(
      userIds.map(async (userId) => {
        const notification = await this.notificationRepository.create({ ...data, userId });
        this.realtimeNotifier.pushNotification(notification);
      }),
    );
  }

  private async staffIds(): Promise<string[]> {
    const { items } = await this.userRepository.list({
      role: ['AGENT', 'ADMIN'],
      active: true,
      page: 1,
      pageSize: MAX_STAFF,
    });
    return items.map((user) => user.id);
  }

  private async updateRecipientIds(ticket: Ticket, changeType: 'status' | 'assignment'): Promise<Set<string>> {
    const ids = new Set<string>([ticket.requesterId]);

    const { items: admins } = await this.userRepository.list({
      role: 'ADMIN',
      active: true,
      page: 1,
      pageSize: MAX_STAFF,
    });
    admins.forEach((admin) => ids.add(admin.id));

    // Atribuição muda QUEM enxerga o chamado (mesma regra de canViewTicket):
    // um agent que via esse chamado por estar sem responsável precisa saber
    // que ele saiu da fila dele, mesmo não sendo o novo responsável — por
    // isso todo agent entra aqui, e não só quem ficou atribuído.
    if (changeType === 'assignment' || ticket.assigneeIds.length === 0) {
      const { items: agents } = await this.userRepository.list({
        role: 'AGENT',
        active: true,
        page: 1,
        pageSize: MAX_STAFF,
      });
      agents.forEach((agent) => ids.add(agent.id));
    }

    if (changeType === 'status') {
      ticket.assigneeIds.forEach((id) => ids.add(id));
    }

    return ids;
  }
}
