import { Comment } from '../../../domain/entities/comment.entity';
import { ForbiddenError } from '../../../domain/errors/auth-errors';
import { CommentNotFoundError, TicketNotFoundError } from '../../../domain/errors/ticket-errors';
import { CommentRepository } from '../../../domain/repositories/comment-repository';
import { TicketRepository } from '../../../domain/repositories/ticket-repository';
import { Actor, UpdateCommentInternalInput } from '../../dtos/ticket.dto';
import { assertCanViewTicket } from './ticket-access';

export class UpdateCommentInternalUseCase {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly commentRepository: CommentRepository,
  ) {}

  async execute(
    ticketId: string,
    commentId: string,
    input: UpdateCommentInternalInput,
    actor: Actor,
  ): Promise<Comment> {
    if (actor.role === 'CUSTOMER') {
      throw new ForbiddenError();
    }

    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new TicketNotFoundError();
    }

    assertCanViewTicket(actor, ticket);

    const comment = await this.commentRepository.findById(commentId);
    if (!comment || comment.ticketId !== ticketId) {
      throw new CommentNotFoundError();
    }

    // Agentes/admins só podem alterar a visibilidade de mensagens que eles mesmos enviaram.
    if (comment.authorId !== actor.userId) {
      throw new ForbiddenError();
    }

    return this.commentRepository.updateIsInternal(commentId, input.isInternal);
  }
}
