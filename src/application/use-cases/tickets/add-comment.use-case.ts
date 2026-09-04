import { Comment } from '../../../domain/entities/comment.entity';
import { TicketNotFoundError } from '../../../domain/errors/ticket-errors';
import { CommentRepository } from '../../../domain/repositories/comment-repository';
import { TicketRepository } from '../../../domain/repositories/ticket-repository';
import { Actor, AddCommentInput } from '../../dtos/ticket.dto';
import { assertCanViewTicket } from './ticket-access';

export class AddCommentUseCase {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly commentRepository: CommentRepository,
  ) {}

  async execute(ticketId: string, input: AddCommentInput, actor: Actor): Promise<Comment> {
    const ticket = await this.ticketRepository.findById(ticketId);

    if (!ticket) {
      throw new TicketNotFoundError();
    }

    assertCanViewTicket(actor, ticket);

    const isInternal = actor.role === 'CUSTOMER' ? false : (input.isInternal ?? false);

    return this.commentRepository.create({
      ticketId,
      authorId: actor.userId,
      body: input.body,
      isInternal,
    });
  }
}
