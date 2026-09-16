import { Ticket, TicketPriority, TicketStatus } from '../../domain/entities/ticket.entity';
import { EmailSender } from '../../domain/ports/email-sender';
import { RealtimeNotifier } from '../../domain/ports/realtime-notifier';
import { CreateNotificationData, NotificationRepository } from '../../domain/repositories/notification-repository';
import { UserRepository } from '../../domain/repositories/user-repository';

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  WAITING: 'Aguardando',
  PENDING_CLOSURE: 'Pendente de fechamento',
  RESOLVED: 'Fechado',
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

type TicketChangeType = 'status' | 'assignment' | 'priority';

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
    private readonly emailSender: EmailSender,
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

  // `changeTypes` aceita mais de um aspecto pra cobrir edição em lote (ex:
  // status + prioridade juntos): uma única notificação combinada, em vez de
  // uma por campo alterado.
  async notifyTicketUpdated(ticket: Ticket, actorId: string, changeTypes: TicketChangeType[]): Promise<void> {
    const recipientIds = await this.updateRecipientIds(ticket, changeTypes);
    recipientIds.delete(actorId); // quem fez a mudança já vê o resultado na própria tela

    const detail = changeTypes
      .map((changeType) => {
        if (changeType === 'status') return `Novo status: ${STATUS_LABELS[ticket.status]}`;
        if (changeType === 'priority') return `Nova prioridade: ${PRIORITY_LABELS[ticket.priority]}`;
        return 'Responsável atualizado';
      })
      .join(' · ');

    await this.dispatch([...recipientIds], {
      type: 'TICKET_UPDATED',
      title: `Chamado #${ticket.number} atualizado`,
      body: `${ticket.title} · ${detail}`,
      ticketId: ticket.id,
      ticketNumber: ticket.number,
    });

    // Fechamento é sempre uma mudança de status pra RESOLVED — mesmo evento
    // que qualquer outra troca de status pro resto do sistema (mesmo `type`
    // de notificação in-app), mas com preferência de e-mail própria: quem não
    // quer ser avisado de toda atualização ainda pode querer saber quando o
    // chamado fecha.
    const isClosed = changeTypes.includes('status') && ticket.status === 'RESOLVED';
    await this.sendUpdateEmails([...recipientIds], ticket, detail, isClosed);
  }

  // Mensagem nova (comentário/anexo) não vira notificação persistida — seria
  // barulho demais no sino a cada mensagem do chat. É só um empurrão em tempo
  // real pra quem já pode ver o chamado, pra atualizar a conversa se estiver
  // aberta na tela. Nota interna nunca vai pro solicitante (ele não pode nem
  // ver a mensagem).
  async notifyTicketMessage(ticket: Ticket, authorId: string, isInternal: boolean): Promise<void> {
    const recipientIds = await this.updateRecipientIds(ticket, ['status']);
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

  // Um e-mail por destinatário elegível (preferência ligada) — nunca por quem
  // fez a mudança, já removido de `userIds` por quem chama.
  private async sendUpdateEmails(
    userIds: string[],
    ticket: Ticket,
    detail: string,
    isClosed: boolean,
  ): Promise<void> {
    await Promise.all(
      userIds.map(async (userId) => {
        const user = await this.userRepository.findById(userId);
        if (!user) return;

        const enabled = isClosed ? user.emailOnTicketClosed : user.emailOnTicketUpdated;
        if (!enabled) return;

        await this.emailSender.send({
          to: user.email,
          subject: isClosed ? `Chamado #${ticket.number} fechado` : `Chamado #${ticket.number} atualizado`,
          html: `<p><strong>${ticket.title}</strong></p><p>${detail}</p>`,
        });
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

  private async updateRecipientIds(ticket: Ticket, changeTypes: TicketChangeType[]): Promise<Set<string>> {
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
    if (changeTypes.includes('assignment') || ticket.assigneeIds.length === 0) {
      const { items: agents } = await this.userRepository.list({
        role: 'AGENT',
        active: true,
        page: 1,
        pageSize: MAX_STAFF,
      });
      agents.forEach((agent) => ids.add(agent.id));
    }

    if (changeTypes.includes('status') || changeTypes.includes('priority')) {
      ticket.assigneeIds.forEach((id) => ids.add(id));
    }

    return ids;
  }
}
