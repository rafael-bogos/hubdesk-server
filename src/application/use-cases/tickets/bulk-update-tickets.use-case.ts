import { Ticket } from '../../../domain/entities/ticket.entity';
import { ForbiddenError } from '../../../domain/errors/auth-errors';
import { TicketRepository, UpdateTicketData } from '../../../domain/repositories/ticket-repository';
import { TicketNotificationService } from '../../services/ticket-notification-service';
import { Actor, BulkUpdateTicketsInput } from '../../dtos/ticket.dto';
import { assertCanViewTicket, resolveTicketByNumber } from './ticket-access';

export interface BulkUpdateTicketsFailure {
  ticketNumber: number;
  reason: string;
}

export interface BulkUpdateTicketsOutput {
  updated: Ticket[];
  failed: BulkUpdateTicketsFailure[];
}

const sameAssignees = (current: string[], next: string[]): boolean =>
  current.length === next.length && next.every((id) => current.includes(id));

// Aplica status/prioridade/responsáveis a vários chamados de uma vez (edição
// em lote na listagem). Cada chamado é tratado de forma independente: um que
// falhe (não encontrado / sem permissão de visualização) vai pra `failed` e
// não interrompe os demais.
export class BulkUpdateTicketsUseCase {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly ticketNotificationService: TicketNotificationService,
  ) {}

  async execute(input: BulkUpdateTicketsInput, actor: Actor): Promise<BulkUpdateTicketsOutput> {
    if (actor.role === 'CUSTOMER') {
      throw new ForbiddenError();
    }

    const updated: Ticket[] = [];
    const failed: BulkUpdateTicketsFailure[] = [];

    for (const ticketNumber of input.ticketNumbers) {
      try {
        const ticket = await resolveTicketByNumber(this.ticketRepository, String(ticketNumber));
        assertCanViewTicket(actor, ticket);

        const changeTypes: Array<'status' | 'priority' | 'assignment'> = [];
        const data: UpdateTicketData = {};

        if (input.status !== undefined && input.status !== ticket.status) {
          data.status = input.status;
          // RESOLVED é o status terminal agora que CLOSED não existe mais.
          data.closedAt = input.status === 'RESOLVED' ? new Date() : null;
          changeTypes.push('status');
        }

        if (input.priority !== undefined && input.priority !== ticket.priority) {
          data.priority = input.priority;
          changeTypes.push('priority');
        }

        let result = ticket;
        if (Object.keys(data).length > 0) {
          result = await this.ticketRepository.update(ticket.id, data);
        }

        if (input.assigneeIds !== undefined && !sameAssignees(ticket.assigneeIds, input.assigneeIds)) {
          result = await this.ticketRepository.setAssignees(ticket.id, input.assigneeIds);
          changeTypes.push('assignment');
        }

        if (changeTypes.length > 0) {
          await this.ticketNotificationService.notifyTicketUpdated(result, actor.userId, changeTypes);
        }

        updated.push(result);
      } catch (err) {
        failed.push({
          ticketNumber,
          reason: err instanceof Error ? err.message : 'Erro desconhecido',
        });
      }
    }

    return { updated, failed };
  }
}
