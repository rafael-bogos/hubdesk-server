import { Comment } from '../../../domain/entities/comment.entity';
import { CommentRepository } from '../../../domain/repositories/comment-repository';
import { TicketRepository } from '../../../domain/repositories/ticket-repository';
import { TicketNotificationService } from '../../services/ticket-notification-service';
import { Actor, AddCommentInput } from '../../dtos/ticket.dto';
import { assertCanViewTicket, resolveTicketByNumber } from './ticket-access';

export class AddCommentUseCase {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly commentRepository: CommentRepository,
    private readonly ticketNotificationService: TicketNotificationService,
  ) {}

  async execute(ticketIdParam: string, input: AddCommentInput, actor: Actor): Promise<Comment> {
    const ticket = await resolveTicketByNumber(this.ticketRepository, ticketIdParam);

    assertCanViewTicket(actor, ticket);

    const isInternal = actor.role === 'CUSTOMER' ? false : (input.isInternal ?? false);

    const comment = await this.commentRepository.create({
      ticketId: ticket.id,
      authorId: actor.userId,
      body: input.body,
      isInternal,
    });

    await this.ticketNotificationService.notifyTicketMessage(ticket, actor.userId, isInternal);

    return comment;
  }
}
